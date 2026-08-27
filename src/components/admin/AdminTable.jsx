// src/components/admin/AdminTable.jsx
import { Skeleton } from '@components/skeleton/BaseSkeleton';
import './AdminTable.css';

const SKELETON_WIDTHS = ['58%', '76%', '68%', '52%', '72%'];
const ELLIPSIS_CELL_CLASSES = ['admin-table__long-text', 'admin-table__compact-text'];

const usesEllipsis = (className = '') => (
  ELLIPSIS_CELL_CLASSES.some((name) => className.split(/\s+/).includes(name))
);

const AdminTable = ({
  columns = [], data = [], onRowClick, rowKey, emptyMessage = '데이터가 없습니다.',
  loading = false, loadingRows = 6,
}) => (
  <table className={`admin-table${loading ? ' admin-table--loading' : ''}`}>
    <thead>
      <tr>{columns.map(col => <th key={col.key}>{col.label}</th>)}</tr>
    </thead>
    <tbody>
      {loading
        ? Array.from({ length: loadingRows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((col, columnIndex) => (
                <td key={col.key}>
                  <Skeleton
                    height={14}
                    width={col.skeletonWidth ?? SKELETON_WIDTHS[columnIndex % SKELETON_WIDTHS.length]}
                  />
                </td>
              ))}
            </tr>
          ))
        : data.length === 0
          ? <tr><td colSpan={columns.length} style={{ textAlign: 'center', color: '#888', padding: '40px' }}>{emptyMessage}</td></tr>
          : data.map((row, idx) => (
              <tr key={rowKey ? rowKey(row) : idx} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
                {columns.map((col) => {
                  const content = col.render
                    ? col.render(row[col.key], row, idx)
                    : row[col.key];
                  const ellipsisTitle = typeof content === 'string' || typeof content === 'number'
                    ? String(content)
                    : undefined;

                  return (
                    <td className={col.className} key={col.key}>
                      {usesEllipsis(col.className) ? (
                        <div className="admin-table__ellipsis-content" title={ellipsisTitle}>
                          {content}
                        </div>
                      ) : content}
                    </td>
                  );
                })}
              </tr>
            ))
      }
    </tbody>
  </table>
);
export default AdminTable;
