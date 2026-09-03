// Google OAuth & Authentication Helper for CivicLens
const Auth = {
  // Initialize Google One Tap / Sign-In button
  initGoogleAuth: (clientId, callbackHandler) => {
    if (typeof google === 'undefined' || !google.accounts) {
      console.warn("Google OAuth library not loaded yet.");
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
      callback: callbackHandler,
      auto_select: false,
    });

    const btnContainer = document.getElementById('google-signin-btn');
    if (btnContainer) {
      google.accounts.id.renderButton(btnContainer, {
        theme: 'filled_blue',
        size: 'large',
        shape: 'pill',
        width: '100%',
        text: 'signin_with',
      });
    }
  },

  // Handle Google Credential Response
  handleGoogleResponse: async (response) => {
    try {
      const res = await API.request('/auth/google', 'POST', {
        credential: response.credential,
      });

      API.setAuth(res.token, res.user, 'citizen');
      API.showToast("Signed in with Google successfully!", "success");
      setTimeout(() => {
        window.location.href = '/user-dashboard.html';
      }, 1000);
    } catch (error) {
      API.showToast(error.message || "Google sign-in failed", "error");
    }
  }
};
