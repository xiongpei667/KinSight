import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Viewer from './Viewer';

// 根据路径决定渲染哪个组件
const path = window.location.pathname;
const isViewer = path === '/view';

const Component = isViewer ? Viewer : App;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>
);
