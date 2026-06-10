using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GolfCoachApi;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var jwtSecret = builder.Configuration["JwtSecret"] ?? "dev-secret-change-in-prod-must-be-32-chars-min";
var dbUrl = builder.Configuration["DatabaseUrl"]
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? "Host=localhost;Database=michaelgayvoronsky";

builder.Services.AddDbContext<AppDb>(opts => opts.UseNpgsql(NormalizeConn(dbUrl)));
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins("http://localhost:3000")
    .AllowAnyHeader().AllowAnyMethod()));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<AppDb>().Database.EnsureCreated();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// --- Auth ---
app.MapPost("/api/auth/signup", async (SignupRequest body, AppDb db) =>
{
    if (await db.Users.AnyAsync(u => u.Email == body.Email))
        return Results.Conflict(new { detail = "Email already registered" });

    var user = new User
    {
        Email = body.Email,
        DisplayName = body.DisplayName,
        HashedPassword = BCrypt.Net.BCrypt.HashPassword(body.Password),
        SkillLevel = body.SkillLevel,
    };
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Ok(new AuthResponse(MakeToken(user, jwtSecret), user.Id, user.Email, user.DisplayName, user.SkillLevel));
});

app.MapPost("/api/auth/login", async (LoginRequest body, AppDb db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == body.Email);
    if (user is null || !BCrypt.Net.BCrypt.Verify(body.Password, user.HashedPassword))
        return Results.Json(new { detail = "Invalid email or password" }, statusCode: 401);
    return Results.Ok(new AuthResponse(MakeToken(user, jwtSecret), user.Id, user.Email, user.DisplayName, user.SkillLevel));
});

// --- Users ---
app.MapGet("/api/users/me", async (HttpContext ctx, AppDb db) =>
{
    var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (uid is null) return Results.Unauthorized();
    var u = await db.Users.FindAsync(uid);
    return u is null ? Results.NotFound() : Results.Ok(new UserResponse(u.Id, u.Email, u.DisplayName, u.SkillLevel, u.AvatarUrl, u.Bio));
}).RequireAuthorization();

app.MapGet("/api/users/{id}", async (string id, AppDb db) =>
{
    var u = await db.Users.FindAsync(id);
    return u is null ? Results.NotFound() : Results.Ok(new UserResponse(u.Id, u.Email, u.DisplayName, u.SkillLevel, u.AvatarUrl, u.Bio));
});

// --- Posts ---
app.MapGet("/api/posts", async (int skip, int limit, AppDb db) =>
{
    if (limit <= 0) limit = 12;
    var posts = await db.Posts.Include(p => p.Author)
        .OrderByDescending(p => p.CreatedAt).Skip(skip).Take(limit).ToListAsync();
    return Results.Ok(posts.Select(p => new PostSummary(
        p.Id, p.Caption, p.MediaUrl, p.MediaType, p.CreatedAt,
        new AuthorDto(p.Author!.Id, p.Author.DisplayName, p.Author.SkillLevel, p.Author.AvatarUrl))));
});

app.MapGet("/api/posts/{id}", async (string id, AppDb db) =>
{
    var p = await db.Posts.Include(x => x.Author).FirstOrDefaultAsync(x => x.Id == id);
    return p is null ? Results.NotFound() : Results.Ok(new PostSummary(
        p.Id, p.Caption, p.MediaUrl, p.MediaType, p.CreatedAt,
        new AuthorDto(p.Author!.Id, p.Author.DisplayName, p.Author.SkillLevel, p.Author.AvatarUrl)));
});

app.MapPost("/api/posts", async (CreatePostRequest body, HttpContext ctx, AppDb db) =>
{
    var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (uid is null) return Results.Unauthorized();

    string mediaType;
    if (body.ContentType is "image/jpeg" or "image/png" or "image/webp")
    {
        if (body.FileSize > 10 * 1024 * 1024) return Results.BadRequest(new { detail = "Image exceeds 10 MB" });
        mediaType = "image";
    }
    else if (body.ContentType is "video/mp4" or "video/quicktime" or "video/webm")
    {
        if (body.FileSize > 100 * 1024 * 1024) return Results.BadRequest(new { detail = "Video exceeds 100 MB" });
        mediaType = "video";
    }
    else return Results.BadRequest(new { detail = $"Unsupported type {body.ContentType}" });

    var post = new Post { AuthorId = uid, Caption = body.Caption, MediaUrl = body.MediaUrl, MediaType = mediaType };
    db.Posts.Add(post);
    await db.SaveChangesAsync();
    return Results.Created($"/api/posts/{post.Id}", new { id = post.Id });
}).RequireAuthorization();

app.MapDelete("/api/posts/{id}", async (string id, HttpContext ctx, AppDb db) =>
{
    var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (uid is null) return Results.Unauthorized();
    var post = await db.Posts.FindAsync(id);
    if (post is null) return Results.NotFound();
    if (post.AuthorId != uid) return Results.Forbid();
    db.Posts.Remove(post);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

app.Run();

static string MakeToken(User u, string secret)
{
    var claims = new[] { new Claim(ClaimTypes.NameIdentifier, u.Id), new Claim(ClaimTypes.Email, u.Email) };
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var jwt = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.AddDays(30), signingCredentials: creds);
    return new JwtSecurityTokenHandler().WriteToken(jwt);
}

// Convert postgres:// url to Npgsql conn string if needed
static string NormalizeConn(string url)
{
    if (!url.StartsWith("postgres")) return url;
    if (url.Contains(';')) return url;
    var uri = new Uri(url);
    var userInfo = uri.UserInfo.Split(':');
    var user = userInfo.Length > 0 ? userInfo[0] : "";
    var pwd = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    var db = uri.AbsolutePath.TrimStart('/');
    return $"Host={uri.Host};Port={(uri.Port > 0 ? uri.Port : 5432)};Database={db};Username={user};Password={pwd}";
}

public class AppDb : DbContext
{
    public AppDb(DbContextOptions<AppDb> opts) : base(opts) { }
    public DbSet<User> Users => Set<User>();
    public DbSet<Post> Posts => Set<Post>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<User>().HasIndex(u => u.Email).IsUnique();
        mb.Entity<User>().Property(u => u.SkillLevel).HasConversion<string>();
        mb.Entity<Post>().HasOne(p => p.Author).WithMany(u => u.Posts)
            .HasForeignKey(p => p.AuthorId).OnDelete(DeleteBehavior.Cascade);
    }
}
