(function() { //begin namespace

var docLists = document.querySelectorAll('.agency-docs')
	function expandAll() {
		docLists.forEach(function(item) {
			item.classList.add('open');
		})
	}
	function collapseAll() {
		docLists.forEach(function(item) {
			item.classList.remove('open');
		})
	}
}()//end namespace