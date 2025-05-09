export const asyncHandler = () => {
    return (target:any, propertyKey:string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        descriptor.value = async function (...args: any[]) {
            const [ , res, next ] = args
            
            try {
                const result = await originalMethod.apply(this, args)

                if ( result !== undefined ) res.status(200).json({
                    success: true,
                    message: 'Service executed successfully',
                    data: result
                })

            } catch ( err ) {
                next( err )

            }
        }
        
        return descriptor
    }
}