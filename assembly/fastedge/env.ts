/**
 * Function to get the value for the provided environment variable name.
 * @param {string} name - The name of the environment variable.
 * @returns {string} The value of the environment variable.
 */
function getEnvVar(name: string): string {
  const hasKey = process.env.has(name);
  if (hasKey) {
    return process.env.get(name);
  }
  return "";
}

export { getEnvVar };
