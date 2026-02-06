/**
 * @deprecated Use {@link getEnv} instead. This function will be removed in a future version.
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
