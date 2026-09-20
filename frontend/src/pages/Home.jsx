import { useState, useEffect } from 'react';
import { 
  Container, Typography, TextField, Button, Box, Grid, Paper, 
  Snackbar, Alert, CircularProgress
} from '@mui/material';
import { createEntry, getEntries } from '../services/api';
import EntryCard from '../components/EntryCard';

export default function Home() {
  const [text, setText] = useState('');
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setIsFetching(true);
      const data = await getEntries();
      setEntries(data);
    } catch (err) {
      console.error(err);
      if (!err.response) {
        setError('Unable to connect to the server.');
      } else {
        setError('Failed to fetch past entries.');
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || text.length > 10000) return;

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const newEntry = await createEntry(text);
      setEntries([newEntry, ...entries]); // Add to top of the list
      setText(''); // clear the textarea
      setSuccessMsg('Summary generated successfully!');
    } catch (err) {
      console.error(err);
      if (!err.response) {
        setError('Unable to connect to the server.');
      } else if (err.response.status === 400 || err.response.status === 422) {
        setError('Please check your input and try again.');
      } else {
        // Assume 500 or other errors are AI/Provider failures
        setError('Unable to generate the summary right now. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, mt: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
          Turn your notes into a concise summary and relevant tags.
        </Typography>
      </Box>

      <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, mb: 8, borderRadius: 2 }}>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            placeholder="Paste your content here..."
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= 10000) {
                setText(e.target.value);
              }
            }}
            disabled={isLoading}
            sx={{ mb: 1 }}
          />
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="caption" color={text.length === 10000 ? 'error' : 'text.secondary'}>
              {text.length} / 10000
            </Typography>
          </Box>
          <Box display="flex" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading || !text.trim()}
              startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {isLoading ? 'Generating your summary...' : 'Generate Summary'}
            </Button>
          </Box>
        </form>
      </Paper>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
          Saved Entries
        </Typography>
      </Box>

      {isFetching ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((n) => (
             <Grid item xs={12} sm={6} md={4} key={n}>
               <EntryCard isLoading={true} />
             </Grid>
          ))}
        </Grid>
      ) : entries.length === 0 ? (
        <Typography color="text.secondary">No saved entries yet. Create your first AI summary.</Typography>
      ) : (
        <Grid container spacing={3}>
          {entries.map((entry) => (
            <Grid item xs={12} sm={6} md={4} key={entry.id}>
              <EntryCard entry={entry} />
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar open={!!error || !!successMsg} autoHideDuration={6000} onClose={() => { setError(null); setSuccessMsg(null); }} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => { setError(null); setSuccessMsg(null); }} severity={error ? "error" : "success"} sx={{ width: '100%' }}>
          {error || successMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
}
