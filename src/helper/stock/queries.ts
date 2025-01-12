export const queries = (key: string) => {
  let query: string = ''
  switch( key ) {
    case 'get':
      query=`
        select 
          i.ProductoID,
          i.NombreProducto,
          i.Descripcion,
          i.Cantidad
        from Inventario as i
        where i.Cantidad > 0
        order by i.NombreProducto ASC;
      `
      break;
    default:
      query = ''
      break
  }
  return query
}