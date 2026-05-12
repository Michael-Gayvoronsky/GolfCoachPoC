using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace client.Services;

public record UserInfo(string Id, string Email, string DisplayName);

public class AuthService
{
    private readonly IHttpClientFactory _httpFactory;

    public UserInfo? CurrentUser { get; private set; }
    public string? IdToken { get; private set; }

    public event Action? AuthStateChanged;

    public AuthService(IHttpClientFactory httpFactory)
    {
        _httpFactory = httpFactory;
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task SignUpAsync(string email, string password, string displayName, string skillLevel)
    {
        var http = _httpFactory.CreateClient("API");
        var response = await http.PostAsJsonAsync("/api/auth/signup", new
        {
            email,
            password,
            display_name = displayName,
            skill_level = skillLevel,
        });

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadFromJsonAsync<ApiError>();
            throw new Exception(err?.Detail ?? "Sign up failed");
        }

        var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
        SetUser(result!);
    }

    public async Task SignInAsync(string email, string password)
    {
        var http = _httpFactory.CreateClient("API");
        var response = await http.PostAsJsonAsync("/api/auth/login", new { email, password });

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadFromJsonAsync<ApiError>();
            throw new Exception(err?.Detail ?? "Sign in failed");
        }

        var result = await response.Content.ReadFromJsonAsync<AuthResponse>();
        SetUser(result!);
    }

    public Task SignOutAsync()
    {
        CurrentUser = null;
        IdToken = null;
        AuthStateChanged?.Invoke();
        return Task.CompletedTask;
    }

    public Task<string?> GetIdTokenAsync() => Task.FromResult(IdToken);

    private void SetUser(AuthResponse r)
    {
        CurrentUser = new UserInfo(r.UserId, r.Email, r.DisplayName);
        IdToken = r.Token;
        AuthStateChanged?.Invoke();
    }

    private record AuthResponse(
        [property: JsonPropertyName("token")] string Token,
        [property: JsonPropertyName("user_id")] string UserId,
        [property: JsonPropertyName("email")] string Email,
        [property: JsonPropertyName("display_name")] string DisplayName,
        [property: JsonPropertyName("skill_level")] string SkillLevel
    );

    private record ApiError(
        [property: JsonPropertyName("detail")] string Detail
    );
}
