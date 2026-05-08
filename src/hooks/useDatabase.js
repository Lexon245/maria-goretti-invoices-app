import { useCallback } from 'react';

const useDatabase = () => {
  if (!window.electron?.db?.query) {
    throw new Error('Electron IPC bridge is not available. Make sure the preload script is loaded.');
  }

  const query = useCallback(async (sql, params) => {
    try {
      return await window.electron.db.query(sql, params);
    } catch (err) {
      console.error('Database Query Error:', err);
      throw err;
    }
  }, []);

  const run = useCallback(async (sql, params) => {
    try {
      return await window.electron.db.run(sql, params);
    } catch (err) {
      console.error('Database Run Error:', err);
      throw err;
    }
  }, []);

  const transaction = useCallback(async (operations) => {
    try {
      return await window.electron.db.transaction(operations);
    } catch (err) {
      console.error('Database Transaction Error:', err);
      throw err;
    }
  }, []);

  return { query, run, transaction };
};

export default useDatabase;
