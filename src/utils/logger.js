/**
 * Reusable logging function that sends logs to the test server API.
 * @param {string} stack - The stack trace or context of the log.
 * @param {string} level - The log level (e.g., 'info', 'error').
 * @param {string} pkg - The package or module name.
 * @param {string} message - The log message.
 * @returns {Promise<void>} - A promise that resolves when the log is sent.
 */
export async function log(stack, level, pkg, message) {
  const url = 'http://20.244.56.144/evaluation-service/logs';
  const body = JSON.stringify({
    stack,
    level,
    package: pkg,
    message,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Log sent successfully');
  } catch (error) {
    console.error('Failed to send log:', error);
    // Optionally, you can rethrow the error or handle it differently
  }
}
