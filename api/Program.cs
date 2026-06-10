using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
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

builder.Services.ConfigureHttpJsonOptions(opts =>
{
    opts.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    opts.SerializerOptions.PropertyNameCaseInsensitive = true;
    opts.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.AddDbContext<AppDb>(opts => opts.UseNpgsql(NormalizeConn(dbUrl)));
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins("http://localhost:3000", "http://localhost:3001")
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
app.MapPost("/api/auth/signup", async (SignupRequest body, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        logger.LogInformation("Signup attempt: email={email}, displayName={displayName}", body.Email, body.DisplayName);

        if (await db.Users.AnyAsync(u => u.Email == body.Email))
        {
            logger.LogWarning("Signup failed: email already exists {email}", body.Email);
            return Results.Conflict(new { detail = "Email already registered" });
        }

        var user = new User
        {
            Email = body.Email,
            DisplayName = body.DisplayName,
            HashedPassword = BCrypt.Net.BCrypt.HashPassword(body.Password),
            SkillLevel = body.SkillLevel,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        logger.LogInformation("Signup successful: userId={userId}, email={email}", user.Id, user.Email);
        return Results.Ok(new AuthResponse(MakeToken(user, jwtSecret), user.Id, user.Email, user.DisplayName, user.SkillLevel));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Signup error: {message}", ex.Message);
        return Results.Json(new { detail = "Registration failed" }, statusCode: 500);
    }
});

app.MapPost("/api/auth/login", async (LoginRequest body, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        logger.LogInformation("Login attempt: email={email}", body.Email);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == body.Email);
        if (user is null || !BCrypt.Net.BCrypt.Verify(body.Password, user.HashedPassword))
        {
            logger.LogWarning("Login failed: invalid credentials for {email}", body.Email);
            return Results.Json(new { detail = "Invalid email or password" }, statusCode: 401);
        }
        logger.LogInformation("Login successful: userId={userId}", user.Id);
        return Results.Ok(new AuthResponse(MakeToken(user, jwtSecret), user.Id, user.Email, user.DisplayName, user.SkillLevel));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Login error: {message}", ex.Message);
        return Results.Json(new { detail = "Login failed" }, statusCode: 500);
    }
});

// --- Users ---
app.MapGet("/api/users/me", async (HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogInformation("Get /me request: userId={userId}", uid);
        if (uid is null) return Results.Unauthorized();
        var u = await db.Users.FindAsync(uid);
        return u is null ? Results.NotFound() : Results.Ok(new UserResponse(u.Id, u.Email, u.DisplayName, u.SkillLevel, u.AvatarUrl, u.Bio));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Get /me error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to fetch user" }, statusCode: 500);
    }
}).RequireAuthorization();

app.MapGet("/api/users/{id}", async (string id, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        logger.LogInformation("Get user: userId={userId}", id);
        var u = await db.Users.FindAsync(id);
        return u is null ? Results.NotFound() : Results.Ok(new UserResponse(u.Id, u.Email, u.DisplayName, u.SkillLevel, u.AvatarUrl, u.Bio));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Get user error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to fetch user" }, statusCode: 500);
    }
});

// --- Posts ---
app.MapGet("/api/posts", async (int skip, int limit, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        logger.LogInformation("Get posts: skip={skip}, limit={limit}", skip, limit);
        if (limit <= 0) limit = 12;
        var posts = await db.Posts.Include(p => p.Author)
            .OrderByDescending(p => p.CreatedAt).Skip(skip).Take(limit).ToListAsync();
        logger.LogInformation("Fetched {count} posts", posts.Count);
        return Results.Ok(posts.Select(p => new PostSummary(
            p.Id, p.Caption, p.MediaUrl, p.MediaType, p.CreatedAt,
            new AuthorDto(p.Author!.Id, p.Author.DisplayName, p.Author.SkillLevel, p.Author.AvatarUrl))));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Get posts error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to fetch posts" }, statusCode: 500);
    }
});

app.MapGet("/api/posts/{id}", async (string id, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        logger.LogInformation("Get post: postId={postId}", id);
        var p = await db.Posts.Include(x => x.Author).FirstOrDefaultAsync(x => x.Id == id);
        return p is null ? Results.NotFound() : Results.Ok(new PostSummary(
            p.Id, p.Caption, p.MediaUrl, p.MediaType, p.CreatedAt,
            new AuthorDto(p.Author!.Id, p.Author.DisplayName, p.Author.SkillLevel, p.Author.AvatarUrl)));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Get post error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to fetch post" }, statusCode: 500);
    }
});

app.MapPost("/api/posts", async (CreatePostRequest body, HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogInformation("Create post: userId={userId}, contentType={contentType}, fileSize={fileSize}", uid, body.ContentType, body.FileSize);
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
        logger.LogInformation("Post created: postId={postId}, userId={userId}", post.Id, uid);
        return Results.Created($"/api/posts/{post.Id}", new { id = post.Id });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Create post error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to create post" }, statusCode: 500);
    }
}).RequireAuthorization();

app.MapDelete("/api/posts/{id}", async (string id, HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogInformation("Delete post: postId={id}, userId={userId}", id, uid);
        if (uid is null) return Results.Unauthorized();
        var post = await db.Posts.FindAsync(id);
        if (post is null) return Results.NotFound();
        if (post.AuthorId != uid) return Results.Forbid();
        db.Posts.Remove(post);
        await db.SaveChangesAsync();
        logger.LogInformation("Post deleted: postId={id}", id);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Delete post error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to delete post" }, statusCode: 500);
    }
}).RequireAuthorization();

// --- Likes ---
app.MapPost("/api/posts/{postId}/like", async (string postId, HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogInformation("Like post: postId={postId}, userId={userId}", postId, uid);
        if (uid is null) return Results.Unauthorized();

        var post = await db.Posts.FindAsync(postId);
        if (post is null) return Results.NotFound();

        var existing = await db.Likes.FirstOrDefaultAsync(l => l.UserId == uid && l.PostId == postId);
        if (existing is not null) return Results.Conflict(new { detail = "Already liked" });

        db.Likes.Add(new Like { UserId = uid, PostId = postId });
        await db.SaveChangesAsync();
        logger.LogInformation("Post liked: postId={postId}", postId);
        return Results.Ok(new { liked = true });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Like error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to like post" }, statusCode: 500);
    }
}).RequireAuthorization();

app.MapDelete("/api/posts/{postId}/like", async (string postId, HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (uid is null) return Results.Unauthorized();

        var like = await db.Likes.FirstOrDefaultAsync(l => l.UserId == uid && l.PostId == postId);
        if (like is null) return Results.NotFound();

        db.Likes.Remove(like);
        await db.SaveChangesAsync();
        logger.LogInformation("Post unliked: postId={postId}", postId);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unlike error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to unlike post" }, statusCode: 500);
    }
}).RequireAuthorization();

// --- Comments ---
app.MapPost("/api/posts/{postId}/comments", async (string postId, CreateCommentRequest body, HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogInformation("Add comment: postId={postId}, userId={userId}", postId, uid);
        if (uid is null) return Results.Unauthorized();

        var post = await db.Posts.FindAsync(postId);
        if (post is null) return Results.NotFound();

        var user = await db.Users.FindAsync(uid);
        var comment = new Comment { UserId = uid, PostId = postId, Content = body.Content };
        db.Comments.Add(comment);
        await db.SaveChangesAsync();
        logger.LogInformation("Comment created: commentId={commentId}", comment.Id);
        return Results.Created($"/api/comments/{comment.Id}", new CommentDto(comment.Id, uid, user?.DisplayName ?? "", user?.AvatarUrl, comment.Content, comment.CreatedAt));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Add comment error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to add comment" }, statusCode: 500);
    }
}).RequireAuthorization();

app.MapDelete("/api/comments/{commentId}", async (string commentId, HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (uid is null) return Results.Unauthorized();

        var comment = await db.Comments.FindAsync(commentId);
        if (comment is null) return Results.NotFound();
        if (comment.UserId != uid) return Results.Forbid();

        db.Comments.Remove(comment);
        await db.SaveChangesAsync();
        logger.LogInformation("Comment deleted: commentId={commentId}", commentId);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Delete comment error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to delete comment" }, statusCode: 500);
    }
}).RequireAuthorization();

app.MapGet("/api/posts/{postId}/comments", async (string postId, int skip = 0, int limit = 20, AppDb db = null!, ILogger<Program> logger = null!) =>
{
    try
    {
        logger.LogInformation("Get comments: postId={postId}, skip={skip}, limit={limit}", postId, skip, limit);
        if (limit <= 0) limit = 20;
        var comments = await db.Comments.Include(c => c.User)
            .Where(c => c.PostId == postId)
            .OrderByDescending(c => c.CreatedAt)
            .Skip(skip).Take(limit)
            .Select(c => new CommentDto(c.Id, c.UserId, c.User!.DisplayName, c.User.AvatarUrl, c.Content, c.CreatedAt))
            .ToListAsync();
        return Results.Ok(comments);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Get comments error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to fetch comments" }, statusCode: 500);
    }
});

// --- Follows ---
app.MapPost("/api/users/{userId}/follow", async (string userId, HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogInformation("Follow user: userId={userId}, followerId={followerId}", userId, uid);
        if (uid is null) return Results.Unauthorized();
        if (uid == userId) return Results.BadRequest(new { detail = "Cannot follow yourself" });

        var target = await db.Users.FindAsync(userId);
        if (target is null) return Results.NotFound();

        var existing = await db.Follows.FirstOrDefaultAsync(f => f.FollowerId == uid && f.FollowingId == userId);
        if (existing is not null) return Results.Conflict(new { detail = "Already following" });

        db.Follows.Add(new Follow { FollowerId = uid, FollowingId = userId });
        await db.SaveChangesAsync();
        logger.LogInformation("User followed: userId={userId}", userId);
        return Results.Ok(new { following = true });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Follow error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to follow user" }, statusCode: 500);
    }
}).RequireAuthorization();

app.MapDelete("/api/users/{userId}/follow", async (string userId, HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (uid is null) return Results.Unauthorized();

        var follow = await db.Follows.FirstOrDefaultAsync(f => f.FollowerId == uid && f.FollowingId == userId);
        if (follow is null) return Results.NotFound();

        db.Follows.Remove(follow);
        await db.SaveChangesAsync();
        logger.LogInformation("User unfollowed: userId={userId}", userId);
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Unfollow error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to unfollow user" }, statusCode: 500);
    }
}).RequireAuthorization();

app.MapGet("/api/users/{userId}/stats", async (string userId, HttpContext ctx, AppDb db, ILogger<Program> logger) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogInformation("Get user stats: userId={userId}", userId);

        var user = await db.Users.FindAsync(userId);
        if (user is null) return Results.NotFound();

        var postCount = await db.Posts.CountAsync(p => p.AuthorId == userId);
        var followerCount = await db.Follows.CountAsync(f => f.FollowingId == userId);
        var followingCount = await db.Follows.CountAsync(f => f.FollowerId == userId);
        var totalLikes = await db.Likes.Join(db.Posts, l => l.PostId, p => p.Id, (l, p) => new { l, p })
            .CountAsync(x => x.p.AuthorId == userId);
        var isFollowedByMe = uid is not null && await db.Follows.AnyAsync(f => f.FollowerId == uid && f.FollowingId == userId);

        return Results.Ok(new UserProfile(user.Id, user.DisplayName, user.SkillLevel, user.AvatarUrl, user.Bio, postCount, followerCount, followingCount, totalLikes, isFollowedByMe));
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Get user stats error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to fetch user stats" }, statusCode: 500);
    }
});

// --- Enhanced Feed with filters ---
app.MapGet("/api/posts/feed", async (int skip = 0, int limit = 12, string? skillLevel = null, HttpContext ctx = null!, AppDb db = null!, ILogger<Program> logger = null!) =>
{
    try
    {
        var uid = ctx.User.FindFirstValue(ClaimTypes.NameIdentifier);
        logger.LogInformation("Get feed: skip={skip}, limit={limit}, skillLevel={skillLevel}", skip, limit, skillLevel);

        if (limit <= 0) limit = 12;
        IQueryable<Post> query = db.Posts.Include(p => p.Author);

        if (!string.IsNullOrEmpty(skillLevel))
            query = query.Where(p => p.Author!.SkillLevel.ToString() == skillLevel);

        var posts = await query.OrderByDescending(p => p.CreatedAt).Skip(skip).Take(limit).ToListAsync();

        var result = posts.Select(p => new PostDetail(
            p.Id, p.Caption, p.MediaUrl, p.MediaType, p.CreatedAt,
            new AuthorDto(p.Author!.Id, p.Author.DisplayName, p.Author.SkillLevel, p.Author.AvatarUrl),
            db.Likes.Count(l => l.PostId == p.Id),
            db.Comments.Count(c => c.PostId == p.Id),
            uid != null && db.Likes.Any(l => l.UserId == uid && l.PostId == p.Id)
        )).ToList();

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Get feed error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to fetch feed" }, statusCode: 500);
    }
});

// --- Trending posts ---
app.MapGet("/api/posts/trending", async (int limit = 12, AppDb db = null!, ILogger<Program> logger = null!) =>
{
    try
    {
        logger.LogInformation("Get trending: limit={limit}", limit);
        if (limit <= 0) limit = 12;

        var cutoff = DateTime.UtcNow.AddDays(-14);
        var posts = await db.Posts.Include(p => p.Author)
            .Where(p => p.CreatedAt > cutoff)
            .ToListAsync();

        var scored = posts.Select(p => new
        {
            Post = p,
            LikeCount = db.Likes.Count(l => l.PostId == p.Id),
            CommentCount = db.Comments.Count(c => c.PostId == p.Id),
        }).Select(x => new
        {
            x.Post,
            x.LikeCount,
            x.CommentCount,
            Score = (x.LikeCount * 2) + (x.CommentCount * 3) + ((DateTime.UtcNow - x.Post.CreatedAt).TotalDays < 1 ? 5 : 0)
        })
        .OrderByDescending(x => x.Score)
        .Take(limit)
        .Select(x => new PostDetail(
            x.Post.Id, x.Post.Caption, x.Post.MediaUrl, x.Post.MediaType, x.Post.CreatedAt,
            new AuthorDto(x.Post.Author!.Id, x.Post.Author.DisplayName, x.Post.Author.SkillLevel, x.Post.Author.AvatarUrl),
            x.LikeCount,
            x.CommentCount,
            false
        ))
        .ToList();

        return Results.Ok(scored);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Get trending error: {message}", ex.Message);
        return Results.Json(new { detail = "Failed to fetch trending" }, statusCode: 500);
    }
});

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
    public DbSet<Like> Likes => Set<Like>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Follow> Follows => Set<Follow>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<User>().ToTable("users");
        mb.Entity<User>().Property(u => u.Id).HasColumnName("id");
        mb.Entity<User>().Property(u => u.Email).HasColumnName("email");
        mb.Entity<User>().Property(u => u.DisplayName).HasColumnName("display_name");
        mb.Entity<User>().Property(u => u.HashedPassword).HasColumnName("hashed_password");
        mb.Entity<User>().Property(u => u.SkillLevel).HasColumnName("skill_level").HasConversion<string>();
        mb.Entity<User>().Property(u => u.AvatarUrl).HasColumnName("avatar_url");
        mb.Entity<User>().Property(u => u.Bio).HasColumnName("bio");
        mb.Entity<User>().Property(u => u.CreatedAt).HasColumnName("created_at");
        mb.Entity<User>().HasIndex(u => u.Email).IsUnique();

        mb.Entity<Post>().ToTable("posts");
        mb.Entity<Post>().Property(p => p.Id).HasColumnName("id");
        mb.Entity<Post>().Property(p => p.AuthorId).HasColumnName("author_id");
        mb.Entity<Post>().Property(p => p.Caption).HasColumnName("caption");
        mb.Entity<Post>().Property(p => p.MediaUrl).HasColumnName("media_url");
        mb.Entity<Post>().Property(p => p.MediaType).HasColumnName("media_type");
        mb.Entity<Post>().Property(p => p.CreatedAt).HasColumnName("created_at");
        mb.Entity<Post>().HasOne(p => p.Author).WithMany(u => u.Posts)
            .HasForeignKey(p => p.AuthorId).OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Like>().ToTable("likes");
        mb.Entity<Like>().Property(l => l.Id).HasColumnName("id");
        mb.Entity<Like>().Property(l => l.UserId).HasColumnName("user_id");
        mb.Entity<Like>().Property(l => l.PostId).HasColumnName("post_id");
        mb.Entity<Like>().Property(l => l.CreatedAt).HasColumnName("created_at");
        mb.Entity<Like>().HasIndex(l => new { l.UserId, l.PostId }).IsUnique();
        mb.Entity<Like>().HasOne(l => l.User).WithMany().HasForeignKey(l => l.UserId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Like>().HasOne(l => l.Post).WithMany(p => p.Likes).HasForeignKey(l => l.PostId).OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Comment>().ToTable("comments");
        mb.Entity<Comment>().Property(c => c.Id).HasColumnName("id");
        mb.Entity<Comment>().Property(c => c.UserId).HasColumnName("user_id");
        mb.Entity<Comment>().Property(c => c.PostId).HasColumnName("post_id");
        mb.Entity<Comment>().Property(c => c.Content).HasColumnName("content");
        mb.Entity<Comment>().Property(c => c.CreatedAt).HasColumnName("created_at");
        mb.Entity<Comment>().HasOne(c => c.User).WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Comment>().HasOne(c => c.Post).WithMany(p => p.Comments).HasForeignKey(c => c.PostId).OnDelete(DeleteBehavior.Cascade);

        mb.Entity<Follow>().ToTable("follows");
        mb.Entity<Follow>().Property(f => f.Id).HasColumnName("id");
        mb.Entity<Follow>().Property(f => f.FollowerId).HasColumnName("follower_id");
        mb.Entity<Follow>().Property(f => f.FollowingId).HasColumnName("following_id");
        mb.Entity<Follow>().Property(f => f.CreatedAt).HasColumnName("created_at");
        mb.Entity<Follow>().HasIndex(f => new { f.FollowerId, f.FollowingId }).IsUnique();
        mb.Entity<Follow>().HasOne(f => f.Follower).WithMany().HasForeignKey(f => f.FollowerId).OnDelete(DeleteBehavior.Cascade);
        mb.Entity<Follow>().HasOne(f => f.Following).WithMany().HasForeignKey(f => f.FollowingId).OnDelete(DeleteBehavior.Cascade);
    }
}
