function selectSeason(season) {
	console.log(season);
	if(season == undefined) {
		$('.selectSeason').show();
	} else {
		$('.selectSeason').hide();
		$('.season').addClass('hidden');
		$('.season-'+season).removeClass('hidden');
		$('.seasonNumber').html(season);
	}
}

$(function() {

	const peliculas = document.querySelectorAll('.pelicula');

	const flechasIzq = document.querySelectorAll('.flecha-izquierda');
	const flechasDer = document.querySelectorAll('.flecha-derecha');

	$(flechasDer).each(function(){

		this.addEventListener('click', () => {

			let _this = this;
			
			let fila = $(this).siblings('.contenedor-carousel')[0];
			let flechaIzquierda = $(this).siblings('.flecha-izquierda')[0];
			let marcapaginas = $(this).siblings('.marcapaginas')[0];
			

			if (marcapaginas != undefined){
				let total = $(marcapaginas).data('total');
				let pos = $(marcapaginas).data('pos') + 1;

				console.log(total,pos);

				if(pos == total) {
					$(marcapaginas).data('pos', 0);
				} else {
					$(marcapaginas).data('pos', pos);
				}

				$(marcapaginas).find('.activo').removeClass('activo');
				$(marcapaginas).find('.posicion.pos-'+pos).addClass('activo');

				console.log(total, pos);
			}

			if($(_this).hasClass('infinito')){
				if( fila.scrollLeft == (fila.scrollWidth - fila.clientWidth) ){
					fila.scrollLeft = 0;
				} else {
					fila.scrollLeft += fila.offsetWidth;
				}

			} else {
				fila.scrollLeft += fila.offsetWidth;

				setTimeout(function(){
					if(fila.scrollLeft > 0) {
						flechaIzquierda.classList.add('activo');
					}
				}, 200);

				setTimeout(function(){
					if( fila.scrollLeft == (fila.scrollWidth - fila.clientWidth) ){
						$(_this).removeClass('activo');
					}
				}, 690);
			}
			
		
		});
	})

	$(flechasIzq).each(function(flecha){

		this.addEventListener('click', () => {

			let _this = this;
			
			let fila = $(this).siblings('.contenedor-carousel')[0];
			let flechaDerecha = $(this).siblings('.flecha-derecha')[0];
			
			fila.scrollLeft -= fila.offsetWidth;

			setTimeout(function(){
				if(fila.scrollLeft < (fila.scrollWidth - fila.clientWidth)) {
					flechaDerecha.classList.add('activo');
				}
			}, 200);
			setTimeout(function(){
				if( fila.scrollLeft == 0 ){
					$(_this).removeClass('activo');
				}
			}, 690);
		
		});
	})




	// ? ----- ----- Hover ----- -----
	peliculas.forEach((pelicula) => {
		pelicula.addEventListener('mouseenter', (e) => {
			const elemento = e.currentTarget;
			setTimeout(() => {
				elemento.classList.add('hover');
			}, 600);
		});

		pelicula.addEventListener('mouseleave', (e) => {
			const elemento = e.currentTarget;
			setTimeout(() => {
				elemento.classList.remove('hover');
			}, 600);
		});
	});
});