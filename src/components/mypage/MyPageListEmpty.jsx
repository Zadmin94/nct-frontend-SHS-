export default function MyPageListEmpty({ message, action }) {
  return (
    <div className="py-16 text-center">
      <p className="muted m-0">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
