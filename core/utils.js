Utils = {
	tohex(d)
    {
        var hex = "0123456789ABCDEF";
        return hex.charAt((d - d % 16)/16) + hex.charAt(d % 16)
    },
	
	addopacity(v, opacity)
	{
		var r = v;
		var isrgb = v.includes("rgb(");
		var isrgba = v.includes("rgba(");
		var ishex = v.includes("#");
		if(isrgba)
		{
			r = v.substring(0, v.lastIndexOf(","))+", "+(opacity/255).toFixed(1)+")";
		}
		else if(ishex)
		{
			r = v.substring(0, 7)+""+Utils.tohex(opacity);
		}
		else if(isrgb)
		{
			r = v.replace(")", ", "+(opacity/255).toFixed(1)+")");
			r = r.replace("rgb(", "rgba(");
		}
		return r;
	},
	
	rgba2hex(rgba)
	{
		m = rgba.replace("rgba(", "").replace(")", "").replace(" ", "").split(",");
	}
}