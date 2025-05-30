import express from 'express';
import { getAlerts, createAlert } from '../controllers/alertController.js';
import { pool } from '../db.js';

const router = express.Router();

router.get('/', getAlerts);
router.post('/', createAlert);

router.delete("/", async (req, res) => {
  try {
    await pool.query("DELETE FROM alerts");
    res.sendStatus(204);
  } catch (err) {
    console.error("❌ Failed to delete alerts:", err);
    res.sendStatus(500);
  }
});

export default router;
