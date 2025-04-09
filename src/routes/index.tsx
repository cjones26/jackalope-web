import { createFileRoute } from '@tanstack/react-router';

import Icon from '@/assets/icon.png';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  // const router = useRouter();

  return (
    <div className="flex flex-1 flex-col bg-background p-4">
      <div className="flex flex-1 items-center justify-center gap-y-4 m-4">
        <img src={Icon} alt="App Icon" className="w-16 h-16 rounded-xl" />
        <h1 className="text-center">Welcome to Jackalope</h1>
      </div>
      <p className="text-center text-muted">
        A private image hosting platform that allows you to upload, organize,
        and view your images securely and efficiently.
      </p>
      <div className="flex flex-col gap-y-4 m-4 items-center">
        <button
          className="w-96 py-2 px-4 bg-default text-white rounded"
          onClick={() => {
            // router.navigate(About));
          }}
        >
          Sign up
        </button>
        <button
          className="w-96 py-2 px-4 bg-secondary text-white rounded"
          onClick={() => {
            // router.push('/sign-in');
          }}
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
