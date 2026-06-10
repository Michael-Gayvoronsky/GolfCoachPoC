using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GolfCoachApi;

public enum SkillLevel { BEGINNER, INTERMEDIATE, EXPERIENCED }

public class User
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string HashedPassword { get; set; } = "";
    public SkillLevel SkillLevel { get; set; } = SkillLevel.BEGINNER;
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Post> Posts { get; set; } = new();
}

public class Post
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string AuthorId { get; set; } = "";
    public string? Caption { get; set; }
    public string MediaUrl { get; set; } = "";
    public string MediaType { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(AuthorId))]
    public User? Author { get; set; }
}

// DTOs
public record SignupRequest(string Email, string Password, string DisplayName, SkillLevel SkillLevel);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string Token, string UserId, string Email, string DisplayName, SkillLevel SkillLevel);
public record UserResponse(string Id, string Email, string DisplayName, SkillLevel SkillLevel, string? AvatarUrl, string? Bio);
public record AuthorDto(string Id, string DisplayName, SkillLevel SkillLevel, string? AvatarUrl);
public record PostSummary(string Id, string? Caption, string MediaUrl, string MediaType, DateTime CreatedAt, AuthorDto Author);
public record CreatePostRequest(string? Caption, string MediaUrl, string MediaType, long FileSize, string ContentType);
