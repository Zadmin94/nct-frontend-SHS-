// src/components/admin/PageMeta.jsx
import { Helmet } from 'react-helmet-async';
const PageMeta = ({ title }) => (
  <Helmet><title>{title} | 에누리컷 Admin</title></Helmet>
);
export default PageMeta;
