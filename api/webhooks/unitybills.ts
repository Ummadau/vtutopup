import depositsHandler from '../hooks/deposits.ts';

export default async function handler(req: any, res: any) {
  return depositsHandler(req, res);
}
