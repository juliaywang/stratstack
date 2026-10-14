import {handler} from '../server.mjs';
export default function api(req,res){
 const url=new URL(req.url,'http://localhost');
 const route=url.searchParams.get('route');
 if(route!==null){url.pathname='/api/'+route;url.searchParams.delete('route');req.url=url.pathname+url.search;}
 return handler(req,res);
}
