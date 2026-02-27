import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, MenuItem, Select, FormControl, InputLabel, Checkbox, ListItemText 
} from '@mui/material';
import { authAPI, ticketAPI } from '../../api/api';

const AssignEngineers = ({ open, onClose, ticket, onAssignmentSuccess }) => {
  const [engineers, setEngineers] = useState([]);
  const [selectedEngineers, setSelectedEngineers] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch engineers when the dialog is opened
  useEffect(() => {
    if (open) {
      const fetchEngineers = async () => {
        try {
          // This must match your backend filter for user_type='engineer'
          const response = await authAPI.getUsers('engineer');
          setEngineers(response.data);
        } catch (error) {
          console.error("Could not load engineers", error);
        }
      };
      fetchEngineers();
    }
  }, [open]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Send array of IDs to the backend
      await ticketAPI.assignTicket(ticket.id, {
        engineer_ids: selectedEngineers,
        note: note
      });
      onAssignmentSuccess(); // Refresh the list
      onClose();
    } catch (error) {
      alert("Error assigning engineers: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Assign Engineers to Ticket #{ticket?.ticket_number}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Select Engineers</InputLabel>
          <Select
            multiple
            value={selectedEngineers}
            onChange={(e) => setSelectedEngineers(e.target.value)}
            renderValue={(selected) => 
              engineers
                .filter(eng => selected.includes(eng.id))
                .map(eng => eng.username)
                .join(', ')
            }
          >
            {engineers.map((eng) => (
              <MenuItem key={eng.id} value={eng.id}>
                <Checkbox checked={selectedEngineers.indexOf(eng.id) > -1} />
                <ListItemText primary={`${eng.first_name} ${eng.last_name} (@${eng.username})`} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Assignment Note"
          multiline
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{ mt: 3 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={selectedEngineers.length === 0 || loading}
        >
          {loading ? 'Assigning...' : 'Assign Selected Engineers'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};