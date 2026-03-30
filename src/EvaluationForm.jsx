import React, { useMemo, useState } from 'react';
import {
  TextField, MenuItem, Slider, Box, Typography, Button, Paper,
  Stack, Chip, Divider, Alert
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import LockIcon from '@mui/icons-material/Lock';
import { useQuery } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import {
  DEFAULT_CRITERIA,
  fetchHandshakeKey,
  fetchPublicCriteria,
  fetchPublicProfessors,
  submitEvaluation,
} from './shared/api/evaluationApi';
import { getApiErrorMessage } from './shared/api/client';

const SECTIONS = ['1-A', '1-B', '1-C', '2-A', '2-B', '2-C', '3-A', '3-B', '4-A'];
const FALLBACK_FACULTIES = [
  { id: 1, name: 'Prof. Madalipay', email: 'madalipay@ua.edu.ph' },
  { id: 2, name: 'Prof. Galang', email: 'galang@ua.edu.ph' },
  { id: 3, name: 'Prof. Alonzo', email: 'alonzo@ua.edu.ph' },
];

const EvaluationForm = () => {
  const [formData, setFormData] = useState({
    studentNumber: '',
    facultyEmail: '',
    section: '',
    rating: 7.5,
    comment: '',
  });
  const [criterionScores, setCriterionScores] = useState({});
  const [loading, setLoading] = useState(false);

  const {
    data: professorsData,
    isError: professorsError,
  } = useQuery({
    queryKey: ['public-professors'],
    queryFn: fetchPublicProfessors,
    retry: 0,
  });

  const {
    data: criteriaData,
    isError: criteriaError,
  } = useQuery({
    queryKey: ['public-criteria'],
    queryFn: fetchPublicCriteria,
    retry: 0,
  });

  const professors = useMemo(() => {
    return Array.isArray(professorsData) && professorsData.length > 0 ? professorsData : FALLBACK_FACULTIES;
  }, [professorsData]);

  const criteria = useMemo(() => {
    return Array.isArray(criteriaData) && criteriaData.length > 0 ? criteriaData : DEFAULT_CRITERIA;
  }, [criteriaData]);

  const hasBackendCriteria = Array.isArray(criteriaData) && criteriaData.length > 0;

  const base64ToArrayBuffer = (base64) => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const arrayBufferToBase64 = (buffer) => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  };

  const handleCriterionChange = (criterionId, value) => {
    setCriterionScores((prev) => ({ ...prev, [criterionId]: value }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!formData.facultyEmail || !formData.section || !formData.comment || !formData.studentNumber) {
      enqueueSnackbar('Please fill in all fields.', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const keyData = await fetchHandshakeKey();
      const serverKeyData = base64ToArrayBuffer(keyData);

      const studentKeyPair = await window.crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveKey']
      );

      const serverPubKey = await window.crypto.subtle.importKey(
        'spki',
        serverKeyData,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );

      const sharedSecret = await window.crypto.subtle.deriveKey(
        { name: 'ECDH', public: serverPubKey },
        studentKeyPair.privateKey,
        { name: 'AES-GCM', length: 128 },
        false,
        ['encrypt']
      );

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        sharedSecret,
        new TextEncoder().encode(formData.comment)
      );

      const studentPubKeyExport = await window.crypto.subtle.exportKey('spki', studentKeyPair.publicKey);

      const scores = hasBackendCriteria
        ? criteria.map((c) => ({
            criterionId: c.id,
            score: Math.round(criterionScores[c.id] ?? 1),
          }))
        : undefined;

      const payload = {
        studentNumber: formData.studentNumber,
        facultyEmail: formData.facultyEmail,
        section: formData.section,
        rating: formData.rating,
        ciphertext: arrayBufferToBase64(encryptedData),
        studentPublicKey: arrayBufferToBase64(studentPubKeyExport),
        iv: arrayBufferToBase64(iv),
        ...(scores ? { scores } : {}),
      };

      await submitEvaluation(payload);
      enqueueSnackbar('Success! Evaluation submitted anonymously.', { variant: 'success' });

      setFormData((prev) => ({ ...prev, comment: '' }));
    } catch (err) {
      enqueueSnackbar(getApiErrorMessage(err, 'Encryption failed. Check if server is running.'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, sm: 4 },
        borderRadius: 4,
        maxWidth: 760,
        mx: 'auto',
        mt: 3,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(246, 250, 255, 0.95))',
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <Chip icon={<ShieldIcon />} color="success" variant="outlined" label="End-to-End Encrypted" />
        <Chip icon={<LockIcon />} color="primary" variant="outlined" label="Anonymous Submission" />
      </Stack>

      {(professorsError || criteriaError) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Some new endpoints are not available yet. Using fallback UI data so form remains functional.
        </Alert>
      )}

      <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
        Faculty Evaluation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Your comment is encrypted in-browser before it is sent to the server.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <TextField
          label="Student ID"
          fullWidth
          required
          value={formData.studentNumber}
          onChange={(e) => setFormData({ ...formData, studentNumber: e.target.value })}
        />

        <TextField
          select
          label="Your Section"
          value={formData.section}
          fullWidth
          required
          onChange={(e) => setFormData({ ...formData, section: e.target.value })}
        >
          {SECTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>

        <TextField
          select
          label="Faculty to Evaluate"
          value={formData.facultyEmail}
          fullWidth
          required
          onChange={(e) => setFormData({ ...formData, facultyEmail: e.target.value })}
        >
          {professors.map((f) => (
            <MenuItem key={f.id || f.email} value={f.email}>
              {f.fullName || f.name} ({f.email})
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ px: { xs: 0.5, sm: 1 } }}>
          <Typography gutterBottom>
            Overall Rating: <b>{formData.rating} / 10</b>
          </Typography>
          <Slider
            value={formData.rating}
            min={0}
            max={10}
            step={0.1}
            valueLabelDisplay="auto"
            color="secondary"
            onChange={(_, val) => setFormData({ ...formData, rating: val })}
          />
        </Box>

        <Divider textAlign="left">Objective Criteria</Divider>

        {criteria.map((criterion) => {
          const min = 1;
          const max = 5;
          const score = criterionScores[criterion.id] ?? 1;

          return (
            <Box key={criterion.id} sx={{ px: { xs: 0.5, sm: 1 } }}>
              <Typography gutterBottom>
                {criterion.title || criterion.label}: <b>{score} / {max}</b>
              </Typography>
              <Slider
                value={score}
                min={min}
                max={max}
                step={1}
                valueLabelDisplay="auto"
                onChange={(_, val) => handleCriterionChange(criterion.id, val)}
              />
            </Box>
          );
        })}

        <TextField
          label="Confidential Feedback"
          multiline
          rows={4}
          fullWidth
          required
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
        />

        <Button variant="contained" size="large" onClick={handleSend} disabled={loading} sx={{ py: 1.5, mt: 0.5 }}>
          {loading ? 'Encrypting...' : 'Submit Encrypted Form'}
        </Button>
      </Box>
    </Paper>
  );
};

export default EvaluationForm;
