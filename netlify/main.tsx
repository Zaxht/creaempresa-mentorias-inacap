import { createRoot } from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import './fonts.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor de la aplicación.');
createRoot(root).render(<Home />);
