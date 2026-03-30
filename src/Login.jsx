import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import {
  Container, Paper, Typography, Box, Divider,
  TextField, Button, Alert, Stack, Chip
} from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import axios from 'axios';

const Login = ({ onLogin }) => {
  const [adminView, setAdminView] = useState(false);
  // Renamed keys to 'username' and 'password' to stay consistent
  const [adminCreds, setAdminCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSuccess = (res) => {
    const decoded = jwtDecode(res.credential);
    if (!decoded.email.endsWith("@ua.edu.ph")) {
      setError("Unauthorized: Please use your official @ua.edu.ph account.");
      return;
    }
    const isFaculty = decoded.email.startsWith('faculty.') || decoded.email.startsWith('prof.');
    onLogin(isFaculty ? 'FACULTY' : 'STUDENT', decoded.email);
  };

  const handleAdminAuth = async () => {
    if (!adminCreds.username || !adminCreds.password) {
      setError("Please enter both username and password.");
      return;
    }

    setError('');
    setLoading(true);
    try {
      // ✅ FIXED: Sending the exact keys the Java 'record LoginRequest' expects
      const res = await axios.post('http://localhost:8080/api/auth/admin-login', {
        username: adminCreds.username,
        password: adminCreds.password
      });

      // ✅ SUCCESS: Store token so the browser remembers the session
      const token = res.data.token;
      sessionStorage.setItem('adminToken', token); 
      
      onLogin('ADMIN', 'admin@system', token);
    } catch (err) {
      // Check if it's a 401 (Invalid Credentials) or something else
      if (err.response && err.response.status === 401) {
        setError("Invalid credentials. Access denied.");
      } else {
        setError("Server connection failed. Is Spring Boot running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: 4,
          textAlign: 'center',
          mt: { xs: 3, md: 6 },
          background:
            'linear-gradient(165deg, rgba(255,255,255,0.98), rgba(243, 247, 251, 0.95))'
        }}
      >
        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 2 }}>
          <Chip icon={<SchoolIcon />} label="UA College of IT" color="primary" variant="outlined" />
          <Chip icon={<LockPersonIcon />} label="Secure Evaluation" color="secondary" variant="outlined" />
        </Stack>

        <Typography variant="h4" color="primary" sx={{ mb: 0.5 }}>
          CIT-EVAL
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Anonymous and encrypted faculty evaluation platform
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {!adminView ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary' }}>
              Sign in with your official account
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, minHeight: 42 }}>
              <GoogleLogin
                onSuccess={onSuccess}
                onError={() => setError("Google Sign-In failed. Please try again.")}
              />
            </Box>
            <Divider sx={{ my: 2 }}>Administrative Access</Divider>
            <Button
              startIcon={<AdminPanelSettingsIcon />}
              size="medium"
              variant="outlined"
              onClick={() => { setAdminView(true); setError(''); }}
            >
              Administrator Portal
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Admin Sign-In
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use authorized credentials to access the decryption dashboard.
            </Typography>
            <TextField
              fullWidth label="Username" margin="normal" size="small"
              value={adminCreds.username}
              onChange={e => setAdminCreds({ ...adminCreds, username: e.target.value })}
            />
            <TextField
              fullWidth label="Password" type="password" margin="normal" size="small"
              value={adminCreds.password}
              onChange={e => setAdminCreds({ ...adminCreds, password: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleAdminAuth()}
            />
            <Button
              fullWidth variant="contained" sx={{ mt: 2, py: 1.1 }}
              onClick={handleAdminAuth}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Login as Admin'}
            </Button>
            <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => setAdminView(false)}>
              Back to Student Login
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Login;