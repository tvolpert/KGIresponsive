document.addEventListener('DOMContentLoaded', function() {
    var pics = document.querySelectorAll('img');

    pics.forEach(function(item){
        item.addEventListener('click', function(e) {
            makeModal(e);
        });
    })

    function makeModal(e) {
        var fig=document.createElement('figure');
        fig.classList.add('modal');
        fig.innerHTML = '<img src='+e.target.src+'>';
        fig.addEventListener('click', function(e){
            e.currentTarget.remove();
        });
        document.body.appendChild(fig);
    }
    
});