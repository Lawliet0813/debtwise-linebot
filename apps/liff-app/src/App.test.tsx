import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

function renderApp() {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
}

describe('LIFF App', () => {
  it('renders dashboard card after LIFF init', async () => {
    renderApp();
    expect(await screen.findByText(/嗨，測試用戶/)).toBeInTheDocument();
  });

  it('renders health page text', async () => {
    window.history.pushState({}, '', '/health');
    renderApp();
    expect(await screen.findByText('OK LIFF')).toBeInTheDocument();
  });
});
