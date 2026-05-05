using System.Security.Claims;
using Microsoft.AspNetCore.Components.Authorization;

namespace client.Services;

public class FirebaseAuthStateProvider : AuthenticationStateProvider
{
    private readonly AuthService _authService;

    public FirebaseAuthStateProvider(AuthService authService)
    {
        _authService = authService;
        _authService.AuthStateChanged += OnAuthStateChanged;
    }

    public override Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        if (_authService.CurrentUser is { } user)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, string.IsNullOrEmpty(user.DisplayName) ? user.Email : user.DisplayName),
            };
            var identity = new ClaimsIdentity(claims, "Firebase");
            return Task.FromResult(new AuthenticationState(new ClaimsPrincipal(identity)));
        }

        return Task.FromResult(new AuthenticationState(new ClaimsPrincipal(new ClaimsIdentity())));
    }

    private void OnAuthStateChanged() =>
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
}
