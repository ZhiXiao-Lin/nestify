export const dva = {
	config: {
		onError(err) {
			err.preventDefault();
			console.error(err.message);
		}
	},

	plugins: [
		require('dva-logger')({
			predicate: (getState, action) => {
				if (action.type.startsWith('@@DVA_LOADING/')) {
					// console.log(getState, action);
					return false;
				} else {
					return true;
				}
			},
			collapsed: true,
			duration: true,
			diff: true
		})
	]
};
