/** Small ID generator that works in React Native without extra crypto deps. */
export function randomId(prefix = 'id'): string {
  const segment = () =>
    Math.floor(Date.now() * Math.random())
      .toString(36)
      .slice(0, 8);
  return `${prefix}_${segment()}_${segment()}`;
}
