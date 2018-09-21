
(function(){console.log('this worked');

	function expandAll() {
		let docLists = document.querySelectorAll('.agency-container');
		docLists.forEach(function(item) {
			item.classList.add('open');
		})
	};
	function collapseAll() {
		let docLists = document.querySelectorAll('.agency-container');
		docLists.forEach(function(item) {
			item.classList.remove('open');
			if (location.hash) {
				location.hash = '';
			}
		})
	}
	document.addEventListener('DOMContentLoaded', function() {
		document.querySelector('#expandAll').addEventListener('click', expandAll);
		document.querySelector('#collapseAll').addEventListener('click', collapseAll);
	});
	
})();