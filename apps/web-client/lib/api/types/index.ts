interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// interface Game {
//     id: string;

// }

export type { ApiResponse };