const pool = require('../db');

const Reel = {
  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO reels (user_id, business_name, business_type, description, festival, location, offer, target_audience, language, style, goal, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.business_name,
        data.business_type || null,
        data.description || null,
        data.festival || null,
        data.location || null,
        data.offer || null,
        data.target_audience || null,
        data.language || 'English',
        data.style || 'Viral',
        data.goal || null,
        data.status || 'draft',
      ]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM reels WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByUser(userId, status = null) {
    let query = 'SELECT * FROM reels WHERE user_id = ?';
    const params = [userId];
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.execute(query, params);
    return rows;
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (!keys.length) return;
    const set = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => fields[k]);
    values.push(id);
    await pool.execute(`UPDATE reels SET ${set} WHERE id = ?`, values);
  },

  async delete(id) {
    await pool.execute('DELETE FROM reels WHERE id = ?', [id]);
  },

  async countByUser(userId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) AS count FROM reels WHERE user_id = ?',
      [userId]
    );
    return rows[0].count;
  },
};

module.exports = Reel;
