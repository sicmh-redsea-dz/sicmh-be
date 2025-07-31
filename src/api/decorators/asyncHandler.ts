export const asyncHandler = () => {
    return (_target:any, _propertyKey:string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value
        descriptor.value = async function (...args: any[]) {
            const [ _req, res, next ] = args
            
            try {
                const result = await originalMethod.apply(this, args)

                if ( result !== undefined ) res.status(200).json({
                    success: true,
                    message: 'Service executed successfully',
                    data: result
                })

            } catch ( err: any ) {
                next( err )

            }
        }
        
        return descriptor
    }
}