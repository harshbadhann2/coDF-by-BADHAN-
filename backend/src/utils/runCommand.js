const { spawn } = require('child_process');

function runCommand(command, args = [], options = {}) {
  const timeoutMs = options.timeoutMs || 120000;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `Command failed with exit code ${code}`));
    });
  });
}

module.exports = { runCommand };
