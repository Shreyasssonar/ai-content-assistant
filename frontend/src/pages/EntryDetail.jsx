import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Chip, Button, 
  CircularProgress, Divider, Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { getEntry } from '../services/api';

export default function EntryDetail() {
  const { id } = useParams();
  const [entry, setEntry] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEntry();
  }, [id]);

  const fetchEntry = async () => {
    try {
      setIsLoading(true);
      const data = await getEntry(id);
      setEntry(data);
    } catch (err) {
      console.error(err);
      if (!err.response) {
        setError('Unable to connect to the server.');
      } else if (err.response.status === 404) {
        setError('Entry not found.');
      } else {
        setError('Failed to load entry details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10 }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography color="text.secondary">Loading entry detail...</Typography>
      </Container>
    );
  }

  if (error || !entry) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 4 }}>
          Back to Entries
        </Button>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error || 'An unknown error occurred.'}</Alert>
      </Container>
    );
  }

  const tags = entry.tags || [];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button component={RouterLink} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 4 }}>
        Back to Entries
      </Button>

      <Paper elevation={2} sx={{ p: { xs: 3, md: 5 }, borderRadius: 2 }}>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" fontWeight="bold">
            Entry
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {new Date(entry.createdAt).toLocaleString()}
          </Typography>
        </Box>

        <Box mb={4}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Original Text
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.primary', lineHeight: 1.6 }}>
            {entry.originalText}
          </Typography>
        </Box>

        <Box mb={4}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Summary
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ fontSize: '1.1rem', lineHeight: 1.7, color: 'text.primary' }}>
            {entry.summary}
          </Typography>
        </Box>

        <Box mb={2}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Tags
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box display="flex" gap={1} flexWrap="wrap">
            {tags.map((tag, index) => (
              <Chip 
                key={index} 
                label={tag} 
                color="primary"
                variant="outlined" 
                sx={{ fontWeight: 'bold' }} 
              />
            ))}
          </Box>
        </Box>

      </Paper>
    </Container>
  );
}
