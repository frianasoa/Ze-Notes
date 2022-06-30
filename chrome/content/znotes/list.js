var list = new function()
{
    this.sort = null;
    this.currentrow = null;
    this.object = [{
        id: 0,
        value: "methodology",
        state: "active",
    },
    {
        id: 1,
        value: "introduction",
        state: "active",
    },
    {
        id: 2,
        value: "conclusion",
        state: "active",
    }]
    
    this.refresh = function()
    {
        var i = 0;
        var obj = this;
        this.sort.innerHTML = "";
        this.object.forEach(data=>{
            /** Add headers */
            if(i==0)
            {
                var header = this.sort.insertRow();
                Object.keys(data).forEach(d=>{
                    var cell = header.insertCell();
                    cell.innerHTML = d;
                });
            }
            var row = this.sort.insertRow();
            row.setAttribute("data-data", JSON.stringify(data));
            row.addEventListener("click", function(e){
                obj.currentrow = JSON.parse(e.currentTarget.dataset.data);
            })
            row.setAttribute("tabindex", i);
            Object.keys(data).forEach(d=>{
                var cell = row.insertCell();
                cell.innerHTML = data[d];
            });
            i++;
        });
    }
    
    this.move = function(arr, row, d) {
        var old_index = arr.findIndex(i => i.id === row.id);
        
        if(d=="down")
        {
            var new_index = Math.min(old_index+1, arr.length-1);
        }
        if(d=="up")
        {
            var new_index = Math.max(old_index-1, 0);
        }
        var o1 = arr[old_index];
        var o2 = arr[new_index];
        arr[new_index] = o1;
        arr[old_index] = o2;
    }
    
    this.init = function()
    {
        this.sort = document.getElementById("sort");
        this.refresh();
    }
}