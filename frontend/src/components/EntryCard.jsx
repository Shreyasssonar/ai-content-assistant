import { Card, CardContent, CardActions, Typography, Button, Box, Chip, Skeleton } from '@mui/material';
import { AutoFixHigh as AiIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

export default function EntryCard({ entry, isLoading }) {
  if (isLoading) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Skeleton variant="text" height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" height={24} width="80%" sx={{ mb: 2 }} />
          <Box display="flex" gap={1} flexWrap="wrap">
            <Skeleton variant="rounded" width={60} height={24} />
            <Skeleton variant="rounded" width={80} height={24} />
            <Skeleton variant="rounded" width={70} height={24} />
          </Box>
        </CardContent>
        <CardActions>
          <Skeleton variant="rounded" width={100} height={36} />
        </CardActions>
      </Card>
    );
  }

  const dateStr = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'Unknown Date';
  const tags = entry.tags || [];

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Box display="flex" alignItems="center" color="primary.main">
            <AiIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="overline" fontWeight="bold" letterSpacing="0.05em">Summary</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {dateStr}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mb: 2, display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3 }}>
          {entry.summary}
        </Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {tags.slice(0, 3).map((tag, index) => (
            <Chip key={index} label={tag} size="small" variant="filled" sx={{ backgroundColor: 'primary.50', color: 'primary.700', fontWeight: 500 }} />
          ))}
          {tags.length > 3 && (
            <Chip label={`+${tags.length - 3}`} size="small" variant="outlined" />
          )}
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button component={RouterLink} to={`/entries/${entry.id}`} variant="outlined" color="primary" fullWidth sx={{ borderRadius: 2 }}>
          View
        </Button>
      </CardActions>
    </Card>
  );
}
