export const dva = {
  config: {
    onError(err) {
      err.preventDefault();
      console.error(err.message);
    },
  },

  plugins: [
    require('dva-logger')({
      predicate: (getState, action) => {
        if (process.env.NODE_ENV === 'production') return false;
        return action.type.endsWith('/@@end');
      },
      collapsed: true,
      duration: true,
      diff: false,
    }),
  ],
};
