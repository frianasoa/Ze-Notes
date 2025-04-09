
const Color = {
  addopacity(v: string, opacity: number)
	{
		let r = v;
		const isrgb = v.includes("rgb(");
		const isrgba = v.includes("rgba(");
		const ishex = v.includes("#");
		if(isrgba)
		{
			r = v.substring(0, v.lastIndexOf(","))+", "+(opacity/255).toFixed(1)+")";
		}
		else if(ishex)
		{
			r = v.substring(0, 7)+""+Color.tohex(opacity);
		}
		else if(isrgb)
		{
			r = v.replace(")", ", "+(opacity/255).toFixed(1)+")");
			r = r.replace("rgb(", "rgba(");
		}
		return r;
	},
  
  tohex(opacity: number)
  {
    const hex = "0123456789ABCDEF";
    return hex.charAt((opacity - opacity % 16)/16) + hex.charAt(opacity % 16)
  },
}

export default Color;