import React, { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  ThemeProvider, createTheme, CssBaseline,
  Box, AppBar, Toolbar, Typography, Button, Container, Chip
} from '@mui/material';
import Login from './Login';
import EvaluationForm from './EvaluationForm';
import FacultyDashboard from './FacultyDashboard';
import AdminDashboard from './AdminDashboard';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0c4a8a' },
    secondary: { main: '#d97706' },
    background: { default: '#f3f7fb', paper: '#ffffff' },
    success: { main: '#0f766e' },
    text: { primary: '#102a43', secondary: '#486581' }
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.02em' },
    h5: { fontWeight: 750 },
    h6: { fontWeight: 700 }
  },
  shape: {
    borderRadius: 14
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid #d9e2ec',
          boxShadow: '0 16px 35px rgba(16, 42, 67, 0.08)'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 12
        }
      }
    }
  }
});

function App() {
  // user: { role, email, token? }
  // The token is only set for ADMIN logins and kept in React state (not localStorage)
  const [user, setUser] = useState(null);

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "412778302941-hdsq9o9c3j4de2af3vbcsrfh6647v7c2.apps.googleusercontent.com";

  const handleLogin = (role, email, token = null) => {
    setUser({ role, email, token });
  };

  const handleLogout = () => setUser(null);

  const roleChipColor = user?.role === 'ADMIN'
    ? 'secondary'
    : user?.role === 'FACULTY'
      ? 'success'
      : 'primary';

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {user && (
          <AppBar
            position="sticky"
            elevation={0}
            color="transparent"
            sx={{
              borderBottom: '1px solid #d9e2ec',
              backdropFilter: 'blur(6px)',
              backgroundColor: 'rgba(255,255,255,0.78)'
            }}
          >
            <Toolbar sx={{ minHeight: 74 }}>
              <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary' }}>
                UA CIT-EVAL
              </Typography>
              <Box sx={{ textAlign: 'right', mr: 2, display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="caption" display="block" sx={{ lineHeight: 1, color: 'text.secondary' }}>
                  Logged in as:
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: 'text.primary' }}>
                  {user.email}
                </Typography>
              </Box>
              <Chip
                label={user.role}
                color={roleChipColor}
                size="small"
                sx={{ mr: 1.5, fontWeight: 800 }}
              />
              <Button color="primary" onClick={handleLogout} variant="outlined" size="small">
                Logout
              </Button>
            </Toolbar>
          </AppBar>
        )}

        <Box
          sx={{
            minHeight: '100vh',
            py: { xs: 3, md: 5 },
            background:
              'radial-gradient(circle at 8% 10%, rgba(12, 74, 138, 0.12), transparent 38%), radial-gradient(circle at 92% 0%, rgba(217, 119, 6, 0.14), transparent 28%)'
          }}
        >
          {!user ? (
            <Login onLogin={handleLogin} />
          ) : (
            <Container maxWidth="lg">
              {user.role === 'STUDENT' && (
                <EvaluationForm studentEmail={user.email} />
              )}
              {user.role === 'FACULTY' && (
                <FacultyDashboard facultyEmail={user.email} />
              )}
              {user.role === 'ADMIN' && (
                // ✅ Pass the session token so AdminDashboard can authorize its requests
                <AdminDashboard adminToken={user.token} />
              )}
            </Container>
          )}
        </Box>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;