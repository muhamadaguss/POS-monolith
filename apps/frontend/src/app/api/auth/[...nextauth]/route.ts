// Route handler Auth.js — mengekspos /api/auth/* (session, csrf, callback, signin/out).
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
