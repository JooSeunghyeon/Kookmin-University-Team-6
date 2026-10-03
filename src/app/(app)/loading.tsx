export default function AppLoading() {
  return (
    <main className="flex flex-col gap-4 px-5 pt-6">
      <div className="h-6 w-32 animate-pulse rounded-full bg-gray-100" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    </main>
  );
}
