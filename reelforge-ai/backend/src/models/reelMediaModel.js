const pool = require('../db');

const ReelMedia = {
  async create(data) {
    const [result] = await pool.execute(
      'INSERT INTO reel_media (reel_id, file_url, file_type, original_name) VALUES (?, ?, ?, ?)',
      [data.reel_id, data.file_url, data.file_type || 'image', data.original_name || null]
    );
    return result.insertId;
  },

  async findByReel(reelId) {
    const [rows] = await pool.execute(
      'SELECT * FROM reel_media WHERE reel_id = ? ORDER BY created_at ASC',
      [reelId]
    );
    return rows;
  },

  async delete(id) {
    await pool.execute('DELETE FROM reel_media WHERE id = ?', [id]);
  },

  async deleteByReel(reelId) {
    await pool.execute('DELETE FROM reel_media WHERE reel_id = ?', [reelId]);
  },
};

module.exports = ReelMedia;
