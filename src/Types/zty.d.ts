declare namespace zty {
  type Row = {
    id: any;
    itemid: any;
    key: any;
    title: any;
    date: any;
    journal: any;
    source: any;
    zpaths: string;
    [key: string]: any;
  };

	type ContextMenuData = {
		state?: string;
		label?: string;
		icon?: any;
    title?: string;
    iconColor?: string;
    textColor?: string;
    bgColor?: string;
    data?: any;
    type?: string;
    options?: any;
		onClick?:(item: ContextMenuData, celldata: Record<string, any>, event?: any) => void;
		onClose?:() => void;
		submenu?: Record<string, zty.ContextMenuData>;
	};

	type ItemData = {
		type?: string;
		key?: string;
		value?: string;
		text?: string;
		comment?: string;
		pagelabel?: string;
		image?: string;
};

}

type Position = "absolute" | "relative" | "fixed" | "sticky" | "static";
