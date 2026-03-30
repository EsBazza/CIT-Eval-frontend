import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';

const FacultyDashboard = ({ facultyEmail }) => {
    const [evals, setEvals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchEvaluations = () => {
        if (!facultyEmail) {
            setError('Faculty email is unavailable. Please log in again.');
            return;
        }

        setLoading(true);
        setError('');
        axios.get(`http://localhost:8080/api/evaluations/faculty/${facultyEmail}`)
            .then(res => {
                setEvals(res.data);
            })
            .catch(() => setError('Unable to load evaluations. Please try again.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchEvaluations();
    }, [facultyEmail]);

    return (
        <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 4, mt: 3 }}>
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1.5}
                sx={{ mb: 2.5 }}
            >
                <Box>
                    <Typography variant="h5" sx={{ color: 'primary.main', mb: 0.5 }}>
                        Faculty Dashboard
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Viewing evaluations for {facultyEmail}
                    </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                    <Chip icon={<LockIcon />} color="success" variant="outlined" label="Student identities hidden" />
                    <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchEvaluations}>
                        Refresh
                    </Button>
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#f7fafc' }}>
                            <TableRow>
                                <TableCell><b>Section</b></TableCell>
                                <TableCell><b>Rating / 10</b></TableCell>
                                <TableCell><b>Feedback</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {evals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                                        No evaluations found yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                evals.map(ev => (
                                    <TableRow key={ev.id} hover>
                                        <TableCell>{ev.section}</TableCell>
                                        <TableCell>{ev.rating}</TableCell>
                                        <TableCell><i>[Encrypted - Viewable by Admin only]</i></TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default FacultyDashboard;