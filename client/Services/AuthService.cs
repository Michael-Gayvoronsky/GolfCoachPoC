using Microsoft.JSInterop;

namespace client.Services;

public record FirebaseUserDto(string Uid, string Email, string DisplayName, string Token);

public record UserInfo(string Uid, string Email, string DisplayName);

public class AuthService : IAsyncDisposable
{
    private readonly IJSRuntime _js;
    private readonly IConfiguration _config;
    private IJSObjectReference? _module;
    private DotNetObjectReference<AuthService>? _dotNetRef;
    private Task? _initTask;

    public UserInfo? CurrentUser { get; private set; }
    public string? IdToken { get; private set; }

    public event Action? AuthStateChanged;

    public AuthService(IJSRuntime js, IConfiguration config)
    {
        _js = js;
        _config = config;
    }

    public Task InitializeAsync() => _initTask ??= InitializeCoreAsync();

    private async Task InitializeCoreAsync()
    {
        _module = await _js.InvokeAsync<IJSObjectReference>("import", "./js/firebase-interop.js");
        _dotNetRef = DotNetObjectReference.Create(this);

        var firebaseConfig = new
        {
            apiKey = _config["Firebase:ApiKey"],
            authDomain = _config["Firebase:AuthDomain"],
            projectId = _config["Firebase:ProjectId"],
            appId = _config["Firebase:AppId"],
        };

        await _module.InvokeVoidAsync("initializeFirebase", firebaseConfig, _dotNetRef);
    }

    [JSInvokable]
    public void OnAuthStateChanged(FirebaseUserDto? user)
    {
        if (user is not null)
        {
            CurrentUser = new UserInfo(user.Uid, user.Email, user.DisplayName);
            IdToken = user.Token;
        }
        else
        {
            CurrentUser = null;
            IdToken = null;
        }
        AuthStateChanged?.Invoke();
    }

    public async Task<string> SignInWithEmailAsync(string email, string password)
    {
        var token = await _module!.InvokeAsync<string>("signInWithEmail", email, password);
        IdToken = token;
        if (CurrentUser is null)
        {
            CurrentUser = new UserInfo("uid", email, email.Split('@')[0]);
            AuthStateChanged?.Invoke();
        }
        return token;
    }

    public async Task<string> SignUpWithEmailAsync(string email, string password)
    {
        var token = await _module!.InvokeAsync<string>("signUpWithEmail", email, password);
        IdToken = token;
        if (CurrentUser is null)
        {
            CurrentUser = new UserInfo("uid", email, email.Split('@')[0]);
            AuthStateChanged?.Invoke();
        }
        return token;
    }

    public async Task<string> SignInWithGoogleAsync()
    {
        var token = await _module!.InvokeAsync<string>("signInWithGoogle");
        IdToken = token;
        if (CurrentUser is null)
        {
            CurrentUser = new UserInfo("google-uid", "demo@example.com", "Demo User");
            AuthStateChanged?.Invoke();
        }
        return token;
    }

    public async Task SignOutAsync()
    {
        await _module!.InvokeVoidAsync("firebaseSignOut");
        CurrentUser = null;
        IdToken = null;
        AuthStateChanged?.Invoke();
    }

    public async Task<string?> GetIdTokenAsync()
    {
        if (_module is null) return null;
        return await _module.InvokeAsync<string?>("getIdToken");
    }

    public async ValueTask DisposeAsync()
    {
        _dotNetRef?.Dispose();
        if (_module is not null)
            await _module.DisposeAsync();
    }
}
