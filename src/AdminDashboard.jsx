import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockIcon from '@mui/icons-material/Lock';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {
  createCriterion,
  createProfessor,
  decryptEvaluation,
  deleteCriterion,
  deleteProfessor,
  fetchCriteria,
  fetchEvaluationsAdmin,
  fetchProfessors,
  updateCriterion,
  updateProfessor,
} from './shared/api/adminApi';
import { getApiErrorMessage } from './shared/api/client';

const AdminDashboard = ({ adminToken }) => {
  const token = adminToken || sessionStorage.getItem('adminToken');
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(0);
  const [decryptingId, setDecryptingId] = useState(null);
  const [decryptedRows, setDecryptedRows] = useState({});
  const [error, setError] = useState('');

  const [profDialogOpen, setProfDialogOpen] = useState(false);
  const [criterionDialogOpen, setCriterionDialogOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [selectedCriterion, setSelectedCriterion] = useState(null);
  const [professorForm, setProfessorForm] = useState({ name: '', email: '', department: '', isActive: true });
  const [criterionForm, setCriterionForm] = useState({ title: '' });

  const {
    data: evaluations = [],
    isLoading: evaluationsLoading,
    refetch: refetchEvaluations,
  } = useQuery({
    queryKey: ['admin-evaluations'],
    queryFn: fetchEvaluationsAdmin,
    enabled: Boolean(token),
  });

  const {
    data: professors = [],
    isLoading: professorsLoading,
    isError: professorsError,
  } = useQuery({
    queryKey: ['admin-professors'],
    queryFn: fetchProfessors,
    enabled: Boolean(token) && activeTab === 1,
    retry: false,
  });

  const {
    data: criteria = [],
    isLoading: criteriaLoading,
    isError: criteriaError,
  } = useQuery({
    queryKey: ['admin-criteria'],
    queryFn: fetchCriteria,
    enabled: Boolean(token) && activeTab === 2,
    retry: false,
  });

  const saveProfessorMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateProfessor(id, payload) : createProfessor(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-professors'] });
      enqueueSnackbar(selectedProfessor ? 'Professor updated.' : 'Professor added.', { variant: 'success' });
      setProfDialogOpen(false);
      setSelectedProfessor(null);
      setProfessorForm({ name: '', email: '', department: '', isActive: true });
    },
    onError: (err) => enqueueSnackbar(getApiErrorMessage(err, 'Unable to save professor.'), { variant: 'error' }),
  });

  const removeProfessorMutation = useMutation({
    mutationFn: (id) => deleteProfessor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-professors'] });
      enqueueSnackbar('Professor removed.', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar(getApiErrorMessage(err, 'Unable to delete professor.'), { variant: 'error' }),
  });

  const saveCriterionMutation = useMutation({
    mutationFn: ({ id, payload }) => (id ? updateCriterion(id, payload) : createCriterion(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-criteria'] });
      enqueueSnackbar(selectedCriterion ? 'Criterion updated.' : 'Criterion added.', { variant: 'success' });
      setCriterionDialogOpen(false);
      setSelectedCriterion(null);
      setCriterionForm({ title: '' });
    },
    onError: (err) => enqueueSnackbar(getApiErrorMessage(err, 'Unable to save criterion.'), { variant: 'error' }),
  });

  const removeCriterionMutation = useMutation({
    mutationFn: (id) => deleteCriterion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-criteria'] });
      enqueueSnackbar('Criterion removed.', { variant: 'success' });
    },
    onError: (err) => enqueueSnackbar(getApiErrorMessage(err, 'Unable to delete criterion.'), { variant: 'error' }),
  });

  const handleDecrypt = async (id) => {
    setDecryptingId(id);
    setError('');
    try {
      const decryptedText = await decryptEvaluation(id);
      queryClient.setQueryData(['admin-evaluations'], (prev = []) => prev.map((item) => (
        item.id === id ? { ...item, ciphertext: decryptedText } : item
      )));
      setDecryptedRows((prev) => ({ ...prev, [id]: true }));
      enqueueSnackbar('Feedback decrypted.', { variant: 'success' });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Decryption failed. Check server keys and session authorization.'));
    } finally {
      setDecryptingId(null);
    }
  };

  const withStableRowIds = (rows, prefix) => {
    if (!Array.isArray(rows)) return [];
    return rows.map((row, index) => {
      const stableId = row?.id ?? row?._id ?? row?.email ?? `${prefix}-${index}`;
      return {
        ...row,
        _rowId: stableId,
        id: row?.id ?? stableId,
      };
    });
  };

  const evaluationRows = useMemo(() => withStableRowIds(evaluations, 'evaluation'), [evaluations]);
  const professorRows = useMemo(() => withStableRowIds(professors, 'professor'), [professors]);
  const criteriaRows = useMemo(() => withStableRowIds(criteria, 'criterion'), [criteria]);

  const openProfessorDialog = (item = null) => {
    setSelectedProfessor(item);
    setProfessorForm(item ? {
      name: item.name || '',
      email: item.email || '',
      department: item.department || '',
      isActive: item.isActive ?? true,
    } : { name: '', email: '', department: '', isActive: true });
    setProfDialogOpen(true);
  };

  const openCriterionDialog = (item = null) => {
    setSelectedCriterion(item);
    setCriterionForm(item ? {
      title: item.title || '',
    } : { title: '' });
    setCriterionDialogOpen(true);
  };

  const evaluationColumns = useMemo(() => ([
    { field: 'studentNumber', headerName: 'Student ID', flex: 1 },
    { field: 'facultyEmail', headerName: 'Faculty Email', flex: 1.3 },
    { field: 'rating', headerName: 'Rating', width: 100 },
    {
      field: 'ciphertext',
      headerName: 'Feedback',
      flex: 1.6,
      renderCell: (params) => (decryptedRows[params.row.id] ? params.row.ciphertext : '••••••••••'),
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 190,
      sortable: false,
      renderCell: (params) => (
        <Button
          variant="contained"
          color="secondary"
          size="small"
          startIcon={<LockOpenIcon />}
          onClick={() => handleDecrypt(params.row.id)}
          disabled={!token || decryptedRows[params.row.id] || decryptingId === params.row.id}
        >
          {decryptingId === params.row.id ? 'Decrypting...' : decryptedRows[params.row.id] ? 'Decrypted' : 'Decrypt'}
        </Button>
      ),
    },
  ]), [decryptingId, decryptedRows, token]);

  const professorColumns = [
    { field: 'name', headerName: 'Professor Name', flex: 1.2 },
    { field: 'email', headerName: 'Email', flex: 1.2 },
    { field: 'department', headerName: 'Department', flex: 1 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openProfessorDialog(params.row)}>
            Edit
          </Button>
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => removeProfessorMutation.mutate(params.row.id)}>
            Delete
          </Button>
        </Stack>
      ),
    },
  ];

  const criteriaColumns = [
    { field: 'title', headerName: 'Criterion', flex: 1.2 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openCriterionDialog(params.row)}>
            Edit
          </Button>
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => removeCriterionMutation.mutate(params.row.id)}>
            Delete
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 2 }}>
      <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 4 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={1.5}
          sx={{ mb: 2.5 }}
        >
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary.main">
              Admin Control Center
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage encrypted evaluations, professors, and objective criteria.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip icon={<LockIcon />} label="Encrypted by default" color="success" variant="outlined" />
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => refetchEvaluations()}>
              Refresh
            </Button>
          </Stack>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} sx={{ mb: 2 }}>
          <Tab label="Evaluations" />
          <Tab label="Professors" />
          <Tab label="Criteria" />
        </Tabs>

        {activeTab === 0 && (
          <Box sx={{ height: 560 }}>
            {evaluationsLoading ? (
              <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}>
                <CircularProgress />
              </Box>
            ) : (
              <DataGrid
                rows={evaluationRows}
                columns={evaluationColumns}
                getRowId={(row) => row._rowId}
                pageSizeOptions={[10, 20, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                disableRowSelectionOnClick
              />
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            {professorsError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Professor endpoints are not available yet. Implement backend route /api/admin/professors.
              </Alert>
            )}
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
              <Button startIcon={<AddIcon />} variant="contained" onClick={() => openProfessorDialog()}>
                Add Professor
              </Button>
            </Stack>
            <Box sx={{ height: 520 }}>
              {professorsLoading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DataGrid
                  rows={professorRows}
                  columns={professorColumns}
                  getRowId={(row) => row._rowId}
                  pageSizeOptions={[10, 20]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                  disableRowSelectionOnClick
                />
              )}
            </Box>
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            {criteriaError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Criteria endpoints are not available yet. Implement backend route /api/admin/criteria.
              </Alert>
            )}
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
              <Button startIcon={<AddIcon />} variant="contained" onClick={() => openCriterionDialog()}>
                Add Criterion
              </Button>
            </Stack>
            <Box sx={{ height: 520 }}>
              {criteriaLoading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <DataGrid
                  rows={criteriaRows}
                  columns={criteriaColumns}
                  getRowId={(row) => row._rowId}
                  pageSizeOptions={[10, 20]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                  disableRowSelectionOnClick
                />
              )}
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog open={profDialogOpen} onClose={() => setProfDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{selectedProfessor ? 'Edit Professor' : 'Add Professor'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={professorForm.name}
              onChange={(e) => setProfessorForm((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Email"
              value={professorForm.email}
              onChange={(e) => setProfessorForm((prev) => ({ ...prev, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Department"
              value={professorForm.department}
              onChange={(e) => setProfessorForm((prev) => ({ ...prev, department: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProfDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => saveProfessorMutation.mutate({ id: selectedProfessor?.id, payload: professorForm })}
            disabled={!professorForm.name || !professorForm.email}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={criterionDialogOpen} onClose={() => setCriterionDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{selectedCriterion ? 'Edit Criterion' : 'Add Criterion'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title"
              value={criterionForm.title}
              onChange={(e) => setCriterionForm((prev) => ({ ...prev, title: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCriterionDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => saveCriterionMutation.mutate({ id: selectedCriterion?.id, payload: criterionForm })}
            disabled={!criterionForm.title}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
