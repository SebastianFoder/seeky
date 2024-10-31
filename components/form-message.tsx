export type Message =
  | { success: string }
  | { error: string }
  | { message: string };

export function FormMessage({ message }: { message: Message }) {
  return (
    <div>
      {"success" in message && (
        <div className="text-success">
          {message.success}
        </div>
      )}
      {"error" in message && (
        <div className="text-error">
          {message.error}
        </div>
      )}
      {"message" in message && (
        <div className="text-error">{message.message}</div>
      )}
    </div>
  );
}
