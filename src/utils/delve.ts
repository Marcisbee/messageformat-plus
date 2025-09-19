export default function dlv(
  obj: Record<string, any> | undefined,
  key: Array<string | number>,
  def?: any,
  p?: number,
  undef?: any,
) {
  for (p = 0; p < key.length; p++) {
    obj = obj ? obj[key[p]] : undef;
  }
  return obj === undef ? def : obj;
}
