WordCloud = {
	init(selector){
		this.width = 450;
		this.height = 450;
		WordCloud.selector = selector;
		WordCloud.fill = d3.scale.category20();
		WordCloud.svg = d3.select(selector).append("svg")
			.attr("width", this.width)
			.attr("height", this.height)
			.append("g")
			.attr("transform", "translate("+this.width/2+","+this.height/2+")");
			
		WordCloud.stopwords = [
			"a", "able", "about", "across", "after", "all", "almost", "also", "am", "among", "an",
			"and", "any", "are", "as", "at", "be", "because", "been", "but", "by", "can", "cannot",
			"could", "did", "do", "does", "either", "else", "ever", "every", "for", "from", "get",
			"got", "had", "has", "have", "he", "her", "hers", "him", "his", "how", "however", "i",
			"if", "in", "into", "is", "it", "its", "just", "least", "let", "like", "likely", "may",
			"me", "might", "most", "must", "my", "neither", "no", "nor", "not", "of", "off", "often",
			"on", "only", "or", "other", "our", "own", "rather", "said", "say", "says", "she", "should",
			"since", "so", "some", "than", "that", "the", "their", "them", "then", "there", "these",
			"they", "this", "tis", "to", "too", "twas", "us", "wants", "was", "we", "were", "what",
			"when", "where", "which", "while", "who", "whom", "why", "will", "with", "would", "yet",
			"you", "your", "–", "-"
		]
	},
	
	update(sentence){
		var words = WordCloud.tokenize(sentence);
		d3.layout.cloud().size([this.width, this.height])
			.words(words)
			.padding(5)
			.rotate(function() { return ~~(Math.random() * 2) * 50; })
			.font("Impact")
			.fontSize(function(d) { return d.size; })
			.on("end", WordCloud.draw)
			.start();
	},
	
	draw(words)
	{
		var cloud = WordCloud.svg.selectAll("g text").data(words, function(d) { return d.text; })
		
		cloud.enter()
            .append("text")
            .style("font-family", "Impact")
            .style("fill", function(d, i) { return WordCloud.fill(i); })
            .attr("text-anchor", "middle")
            .attr('font-size', 1)
            .text(function(d) { return d.text; });
		
		cloud.transition()
			.duration(600)
			.style("font-size", function(d) { return d.size + "px"; })
			.attr("transform", function(d) {
				return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
			})
			.style("fill-opacity", 1);
		
		cloud.exit()
            .transition()
			.duration(200)
			.style('fill-opacity', 1e-6)
			.attr('font-size', 1)
			.remove();
	},
	
	weigh(word, list){
		var count = 0;
		for(w of list)
		{
			if(w==word)
			{
				count+=1;
			}
		}
		return count;
	},
	
	tokenize(sentences){
		var s = sentences.replace(/[!’‘"\.,:;\?\[\]\(\)]/g, ' ').replace(/ /g, " ").split(' ');
		s = s.map(function(d){
			return {
				text: d,
				size: 10+WordCloud.weigh(d, s)*5
			}
		});
		return [...new Map(s.map(item =>
		[item["text"], item])).values()]
			.filter(function(e) {
				  return this.indexOf(e.text.toUpperCase()) < 0;
				},
				WordCloud.stopwords.map(function(e){return e.toUpperCase()})
			)
			.sort(function(a, b){
			if ( a.size > b.size ){
				return -1;
			}
			if ( a.size < b.size ){
				return 1;
			}
			return 0;
		});
	},
	
	extract(table)
	{
		// return table.map(function(row){
			// return row["contents"].map(function(cell){
				// return cell["Selections"].map(function(selection){
					// return selection["Paraphrase"]
				// }).join(" ")
			// }).join(" ")
		// }).join(" ");
	},
	
	row2str(row){
		var words = row["contents"].map(function(cell){
			if(Object.keys(cell).includes("Selections"))
			{
				return cell["Selections"].map(function(selection){
					return Object.values(selection).join(" ");
				}).join(" ")
			}
			else
			{
				return "";
			}
		}).join(" ");
		return words
	},
	
	row2info(row)
	{
		var title = row["info"]["title"];
		var creators = row["info"]["creators"];
		var date = row["info"]["date"];
		return "<div style='width:100%; border-bottom: solid 1px;'><b>Title</b>: "+title+"<br/>"+"<b>Authors</b>: "+creators+"<br/><b>Date</b>: "+date+"</div>";
	},
	
	showrows(t){
		
		var table = document.createElement("table");
		table.style = "border-spacing: 0.5em;";
		document.body.appendChild(table);
		
		var tr=null	;
		var i = 0;	
		for(row of t)
		{
			if(i%3==0)
			{
				tr = table.insertRow(-1);
			}
			
			var td = tr.insertCell(-1);
			td.style = "border: solid 1px; width: 33.3333%; vertical-align: top; padding:0.3em;"
			
			
			var words = this.row2str(row);
			var label = this.row2info(row);
						
			var ldiv = document.createElement("div");
			ldiv.innerHTML = label;
			td.appendChild(ldiv);
			
			if(words.length>0)
			{
				var div = document.createElement("div");
				td.appendChild(div);
				div.id = "div"+i;
				WordCloud.init("#"+div.id);
				WordCloud.update(words);
			}
			i+=1;
		}
		
	}
}

window.addEventListener("load", function() {
	// WordCloud.init("body");
	var table = Zotero.ZeNotes.cache["word-cloud-data"];
	var words = WordCloud.showrows(table);
	
	// var words = WordCloud.extract(data);
	// WordCloud.update(words);
	// Zotero.ZeNotes.cache["word-cloud-data"] = "";
});