import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  emitUnauthorizedEvent,
  getAuthErrorCode,
  getAuthErrorMessage,
  hasAuthorizationHeader,
} from "@/lib/auth-logout";

const createHeaders = (
  token?: string,
  contentType: string = "application/json",
) => {
  const headers: HeadersInit = { "Content-type": contentType };
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const buildQueryParams = (
  params: Record<string, string | number | string[] | undefined>,
) => {
  const queryParams = Object.entries(params)
    .filter(
      ([_, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        value !== 0 &&
        !(Array.isArray(value) && value.length === 0),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return queryParams ? `?${queryParams}` : "";
};

export const userAuthapi = createApi({
  reducerPath: "userAuthapi",
  baseQuery: (() => {
    const rawBaseQuery = fetchBaseQuery({
      baseUrl: `${process.env.NEXT_PUBLIC_API_URL}`,
    });

    const baseQueryWithUnauthorizedLogout: BaseQueryFn<
      string | FetchArgs,
      unknown,
      FetchBaseQueryError
    > = async (args, api, extraOptions) => {
      const result = await rawBaseQuery(args, api, extraOptions);
      const headers = typeof args === "string" ? undefined : args.headers;

      if (
        result.error &&
        typeof result.error.status === "number" &&
        result.error.status === 401 &&
        hasAuthorizationHeader(headers)
      ) {
        const code = getAuthErrorCode(result.error.data);

        emitUnauthorizedEvent({
          code,
          message: getAuthErrorMessage(result.error.data),
          reason: code === "token_not_valid" ? "expired" : "unauthorized",
          status: result.error.status,
        });
      }

      return result;
    };

    return baseQueryWithUnauthorizedLogout;
  })(),
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: [
    "LoggedUser",
    "Cart",
    "Products",
    "ProductDetail",
    "ProductImages",
    "ProductVariants",
    "Categories",
    "Orders",
    "OrderDetail",
    "Stocks",
    "Reviews",
    "UserReviews",
    "Shipping",
    "RedeemCodes",
    "Layout",
    "Newsletter",
    "Users",
    "Bookings",
    "BookingDetail",
    "BookingStats",
    "DashboardStats",
    "SalesChart",
    "TopProducts",
    "RecentOrders",
    "RecentBookings",
    "VisitorStats",
    "CategoryPerformance",
    "TrendingProducts",
    "PopularKeywords",
    "Notifications",
  ],
  endpoints: (builder) => ({
    // ==================== AUTH & USER API ====================

    userDevice: builder.mutation({
      query: (user) => ({
        url: "api/accounts/users/device/",
        method: "POST",
        body: user,
        headers: createHeaders(),
      }),
    }),

    allUsers: builder.query({
      query: ({ username, search, rowsperpage, page, exclude_by, token }) => {
        return {
          url: `api/accounts/admin-users/${
            username ? `by-username/${username}/` : ""
          }${buildQueryParams({
            search,
            page_size: rowsperpage,
            page,
            exclude_by,
          })}`,
          method: "GET",
          headers: createHeaders(token),
        };
      },
      providesTags: (result: any) =>
        result?.results
          ? [
              ...result.results.map((u: any) => ({
                type: "Users" as const,
                id: u.id,
              })),
              { type: "Users" as const, id: "LIST" },
            ]
          : [{ type: "Users" as const, id: "LIST" }],
    }),

    getLoggedUser: builder.query({
      query: ({ token }) => ({
        url: "api/accounts/users/me/",
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "LoggedUser", id: "ME" }],
      keepUnusedDataFor: 5 * 60,
    }),

    getUserProfile: builder.query({
      query: ({ username }) => ({
        url: `api/accounts/users/?name=${username}`,
        method: "GET",
        headers: createHeaders(),
      }),
      keepUnusedDataFor: 3 * 60,
    }),

    updateUserProfile: builder.mutation({
      query: ({ NewFormData, token }) => ({
        url: `api/accounts/users/profile/`,
        method: "PATCH",
        body: NewFormData,
        headers: {
          authorization: `Bearer ${token}`,
        },
      }),
      invalidatesTags: [{ type: "LoggedUser", id: "ME" }],
    }),

    changeUserPassword: builder.mutation({
      query: ({ actualData }) => ({
        url: "api/accounts/changepassword/",
        method: "POST",
        body: actualData,
        headers: createHeaders(),
      }),
    }),

    refreshToken: builder.mutation({
      query: (refreshToken) => ({
        url: "api/accounts/token/refresh/",
        method: "POST",
        body: refreshToken,
        headers: createHeaders(),
      }),
    }),

    deleteUser: builder.mutation({
      query: ({ userId, token }) => ({
        url: `api/accounts/admin-users/${userId}/`,
        method: "DELETE",
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Users" as const, id: arg.userId },
        { type: "Users" as const, id: "LIST" },
      ],
    }),

    updateUserState: builder.mutation({
      query: ({ userId, state, token }) => ({
        url: `api/accounts/admin-users/${userId}/update_state/`,
        method: "PATCH",
        body: { state },
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Users" as const, id: arg.userId },
        { type: "Users" as const, id: "LIST" },
      ],
    }),

    // ==================== PRODUCT API ====================

    productsRegistration: builder.mutation({
      query: ({ formData, token }) => {
        return {
          url: "api/products/products/",
          method: "POST",
          body: formData,
          headers: {
            authorization: `Bearer ${token}`,
          },
        };
      },
      invalidatesTags: [
        { type: "Products", id: "LIST" },
        { type: "Stocks", id: "LIST" },
        { type: "TrendingProducts", id: "LIST" },
      ],
    }),

    productsUpdate: builder.mutation({
      query: ({ formData, token, id }) => {
        return {
          url: `api/products/products/${id}/`,
          method: "PATCH",
          body: formData,
          headers: {
            authorization: `Bearer ${token}`,
          },
        };
      },
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Products", id: "LIST" },
        { type: "ProductDetail", id: arg.id },
        { type: "Stocks", id: "LIST" },
        { type: "TrendingProducts", id: "LIST" },
      ],
    }),

    productImage: builder.mutation({
      query: ({ formData, token, id }) => {
        return {
          url: `api/products/product-images/${id}/`,
          method: "PATCH",
          body: formData,
          headers: {
            authorization: `Bearer ${token}`,
          },
        };
      },
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "ProductImages", id: arg.id },
        { type: "Products", id: "LIST" },
      ],
    }),

    deleteproductImage: builder.mutation({
      query: ({ token, id }) => {
        return {
          url: `api/products/product-images/${id}/`,
          method: "DELETE",
          headers: {
            authorization: `Bearer ${token}`,
          },
        };
      },
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "ProductImages", id: arg.id },
        { type: "Products", id: "LIST" },
      ],
    }),

    variantUpdate: builder.mutation({
      query: ({ token, actualData }) => {
        return {
          url: `api/products/product-variants/${actualData.id}/`,
          method: "PATCH",
          body: actualData,
          headers: createHeaders(token),
        };
      },
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "ProductVariants", id: arg.actualData?.id },
        { type: "Products", id: "LIST" },
        { type: "Stocks", id: "LIST" },
      ],
    }),

    variantDelete: builder.mutation({
      query: ({ token, id }) => {
        return {
          url: `api/products/product-variants/${id}/`,
          method: "DELETE",
          headers: createHeaders(token),
        };
      },
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "ProductVariants", id: arg.id },
        { type: "Products", id: "LIST" },
        { type: "Stocks", id: "LIST" },
      ],
    }),

    productsView: builder.query({
      query: ({
        productslug,
        id,
        search,
        page,
        ids,
        category,
        min_price,
        max_price,
        color,
        size,
        metal,
        stock,
        filter,
        token,
        page_size,
      }) => {
        const queryParams = buildQueryParams({
          page,
          page_size,
          productslug,
          id,
          search,
          ids,
          category,
          min_price,
          max_price,
          color,
          size,
          metal,
          stock,
          filter,
        });
        return {
          url: `api/products/products/${queryParams}`,
          method: "GET",
          headers: createHeaders(token),
        };
      },
      providesTags: (result: any, _error: any, arg: any) => {
        // Single product by slug
        if (arg.productslug && result?.id) {
          return [
            { type: "ProductDetail" as const, id: result.id },
            { type: "Products" as const, id: "LIST" },
          ];
        }
        // Product list
        if (result?.results) {
          return [
            ...result.results.map((p: any) => ({
              type: "Products" as const,
              id: p.id,
            })),
            { type: "Products" as const, id: "LIST" },
          ];
        }
        return [{ type: "Products" as const, id: "LIST" }];
      },
    }),

    productsByIds: builder.query({
      query: ({ ids, all }) => ({
        url: `api/products/get_products_by_ids/?ids=${ids}${
          all ? "&all=true" : ""
        }`,
        method: "GET",
        headers: createHeaders(),
      }),
      providesTags: [{ type: "Products", id: "LIST" }],
      keepUnusedDataFor: 2 * 60,
    }),

    checkout_products: builder.query({
      query: ({ ids, all, token }) => ({
        url: `api/products/products/checkout_products/?ids=${ids}${
          all ? "&all=true" : ""
        }`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "Products", id: "CHECKOUT" }],
    }),

    recommendedProductsView: builder.query({
      query: ({ product_id, token }) => ({
        url: `api/products/recommendations/${
          product_id ? `?product_id=${product_id}` : ""
        }`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "Products", id: "RECOMMENDED" }],
      keepUnusedDataFor: 5 * 60,
    }),

    trendingProductsView: builder.query({
      query: () => ({
        url: "api/products/trending/",
        method: "GET",
        headers: createHeaders(),
      }),
      providesTags: [{ type: "TrendingProducts", id: "LIST" }],
      keepUnusedDataFor: 5 * 60,
    }),

    deleteProducts: builder.mutation({
      query: ({ token, id }) => ({
        url: `api/products/products/${id}/`,
        method: "DELETE",
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Products", id: arg.id },
        { type: "Products", id: "LIST" },
        { type: "ProductDetail", id: arg.id },
        { type: "Stocks", id: "LIST" },
        { type: "TrendingProducts", id: "LIST" },
      ],
    }),

    notifyuser: builder.mutation({
      query: ({ actualData, token }) => ({
        url: "api/products/notifyuser/",
        method: "POST",
        body: actualData,
        headers: createHeaders(token),
      }),
      invalidatesTags: [{ type: "Notifications", id: "LIST" }],
    }),

    getnotifyuser: builder.query({
      query: ({ product, variant, token }) => ({
        url: `api/products/notifyuser/${buildQueryParams({
          product,
          variant,
        })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: (_result: any, _error: any, arg: any) => [
        {
          type: "Notifications" as const,
          id: `${arg.product}-${arg.variant}`,
        },
        { type: "Notifications" as const, id: "LIST" },
      ],
    }),

    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `api/products/products/?id=${id}`,
        method: "DELETE",
        headers: createHeaders(),
      }),
      invalidatesTags: [
        { type: "Products", id: "LIST" },
        { type: "Stocks", id: "LIST" },
        { type: "TrendingProducts", id: "LIST" },
      ],
    }),

    // ==================== CART API ====================

    cartView: builder.query({
      query: ({ token }) => ({
        url: `api/products/cart/`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: ["Cart"],
    }),

    cartPost: builder.mutation({
      query: ({ actualData, token }) => ({
        url: `api/products/cart/`,
        method: "POST",
        body: actualData,
        headers: createHeaders(token),
      }),
      invalidatesTags: ["Cart"],
    }),

    cartUpdate: builder.mutation({
      query: ({ actualData, token }) => ({
        url: `api/products/cart/12/`,
        method: "PATCH",
        body: actualData,
        headers: createHeaders(token),
      }),
      invalidatesTags: ["Cart"],
    }),

    cartDelete: builder.mutation({
      query: ({ id, variantId, token }) => {
        return {
          url: `api/products/cart/${id}/variant/${variantId}/`,
          method: "DELETE",
          headers: createHeaders(token),
        };
      },
      invalidatesTags: ["Cart"],
    }),

    clearCart: builder.mutation({
      query: ({ token }) => ({
        url: "api/products/clearcart/",
        method: "DELETE",
        headers: createHeaders(token),
      }),
      invalidatesTags: ["Cart"],
    }),

    // ==================== SEARCH API ====================

    searchPost: builder.mutation({
      query: ({ actualData }) => {
        return {
          url: `api/accounts/search/`,
          method: "POST",
          body: actualData,
          headers: createHeaders(),
        };
      },
      invalidatesTags: [{ type: "PopularKeywords", id: "LIST" }],
    }),

    popularKeywords: builder.query({
      query: () => ({
        url: "api/accounts/search/popular-keywords/",
        method: "GET",
        headers: createHeaders(),
      }),
      providesTags: [{ type: "PopularKeywords", id: "LIST" }],
      keepUnusedDataFor: 10 * 60,
    }),

    // ==================== CATEGORY API ====================

    categoryView: builder.query({
      query: () => ({
        url: "api/products/categories/",
        method: "GET",
        headers: createHeaders(),
      }),
      providesTags: (result: any) =>
        Array.isArray(result)
          ? [
              ...result.map((c: any) => ({
                type: "Categories" as const,
                id: c.id,
              })),
              { type: "Categories" as const, id: "LIST" },
            ]
          : [{ type: "Categories" as const, id: "LIST" }],
      keepUnusedDataFor: 10 * 60,
    }),

    getCategory: builder.query({
      query: ({ name }) => ({
        url: `api/products/get_category/${buildQueryParams({ name })}`,
        method: "GET",
        headers: createHeaders(),
      }),
      providesTags: [{ type: "Categories", id: "SEARCH" }],
      keepUnusedDataFor: 5 * 60,
    }),

    addCategory: builder.mutation({
      query: ({ formData, token }) => {
        return {
          url: "api/products/categories/",
          method: "POST",
          body: formData,
          headers: {
            authorization: `Bearer ${token}`,
          },
        };
      },
      invalidatesTags: [
        { type: "Categories", id: "LIST" },
        { type: "Categories", id: "SEARCH" },
        { type: "CategoryPerformance", id: "LIST" },
      ],
    }),

    upgradeCategory: builder.mutation({
      query: ({ formData, id, token }) => ({
        url: `api/products/categories/${id}/`,
        method: "PATCH",
        body: formData,
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Categories", id: arg.id },
        { type: "Categories", id: "LIST" },
        { type: "Categories", id: "SEARCH" },
        { type: "CategoryPerformance", id: "LIST" },
      ],
    }),

    deleteCategory: builder.mutation({
      query: ({ id, token }) => ({
        url: `api/products/categories/${id}/`,
        method: "DELETE",
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Categories", id: arg.id },
        { type: "Categories", id: "LIST" },
        { type: "Categories", id: "SEARCH" },
        { type: "CategoryPerformance", id: "LIST" },
      ],
    }),

    // ==================== REDEEM CODE / DISCOUNT API ====================

    redeemCodeView: builder.query({
      query: ({ token }) => ({
        url: `api/sales/redeemcode/`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: (result: any) =>
        Array.isArray(result)
          ? [
              ...result.map((r: any) => ({
                type: "RedeemCodes" as const,
                id: r.id,
              })),
              { type: "RedeemCodes" as const, id: "LIST" },
            ]
          : [{ type: "RedeemCodes" as const, id: "LIST" }],
    }),

    verifyRedeemCode: builder.mutation({
      query: ({ code, token }) => ({
        url: `api/sales/redeemcode/verify-code/`,
        method: "POST",
        body: code,
        headers: createHeaders(token),
      }),
    }),

    addRedeemCode: builder.mutation({
      query: ({ actualData, token }) => ({
        url: "api/sales/redeemcode/",
        method: "POST",
        body: actualData,
        headers: createHeaders(token),
      }),
      invalidatesTags: [{ type: "RedeemCodes", id: "LIST" }],
    }),

    updateRedeemCode: builder.mutation({
      query: ({ actualData, token }) => ({
        url: `api/sales/redeemcode/${actualData.id}/`,
        method: "PATCH",
        body: actualData,
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "RedeemCodes", id: arg.actualData?.id },
        { type: "RedeemCodes", id: "LIST" },
      ],
    }),

    deleteRedeemCode: builder.mutation({
      query: ({ id, token }) => ({
        url: `api/sales/redeemcode/${id}/`,
        method: "DELETE",
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "RedeemCodes", id: arg.id },
        { type: "RedeemCodes", id: "LIST" },
      ],
    }),

    // ==================== LAYOUT API ====================

    getlayout: builder.query({
      query: ({ layoutslug }) => ({
        url: `api/layout/layouts/${layoutslug ? `${layoutslug}/` : ""}`,
        method: "GET",
        headers: createHeaders(),
      }),
      providesTags: (_result: any, _error: any, arg: any) => [
        { type: "Layout" as const, id: arg.layoutslug || "ALL" },
      ],
      keepUnusedDataFor: 10 * 60,
    }),

    createorUpdatelayout: builder.mutation({
      query: ({ layoutslug, NewFormData, token }) => {
        return {
          url: `api/layout/layouts/${layoutslug}/`,
          method: "PATCH",
          body: NewFormData,
          headers: createHeaders(token),
        };
      },
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Layout", id: arg.layoutslug || "ALL" },
      ],
    }),

    // ==================== REVIEW API ====================

    postReview: builder.mutation({
      query: ({ actualData, token }) => {
        return {
          url: "api/products/reviews/post/",
          method: "POST",
          body: actualData,
          headers: {
            authorization: `Bearer ${token}`,
          },
        };
      },
      invalidatesTags: [
        { type: "Reviews", id: "LIST" },
        { type: "UserReviews", id: "LIST" },
        { type: "UserReviews", id: "PENDING" },
      ],
    }),

    updateReview: builder.mutation({
      query: ({ FormData, id, token }) => ({
        url: `api/products/reviews-update/${id}/`,
        method: "PATCH",
        body: FormData,
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Reviews", id: arg.id },
        { type: "Reviews", id: "LIST" },
        { type: "UserReviews", id: "LIST" },
      ],
    }),

    deleteReview: builder.mutation({
      query: ({ data, token, id }) => {
        return {
          url: `api/products/reviews/post/${id}/`,
          method: "DELETE",
          body: data,
          headers: {
            authorization: `Bearer ${token}`,
          },
        };
      },
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Reviews", id: arg.id },
        { type: "Reviews", id: "LIST" },
        { type: "UserReviews", id: "LIST" },
      ],
    }),

    getReview: builder.query({
      query: ({ product_slug, page, page_size, star, filter }) => ({
        url: `api/products/reviews/${product_slug}/data/${buildQueryParams({
          page,
          page_size,
          star,
          filter,
        })}`,
        method: "GET",
        headers: createHeaders(),
      }),
      providesTags: (_result: any, _error: any, arg: any) => [
        { type: "Reviews" as const, id: `PRODUCT-${arg.product_slug}` },
        { type: "Reviews" as const, id: "LIST" },
      ],
    }),

    getUserReview: builder.query({
      query: ({ token, search, page, page_size, star, filter }) => ({
        url: `api/products/reviews/user/${buildQueryParams({
          page,
          page_size,
          star,
          filter,
          search,
        })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "UserReviews", id: "LIST" }],
    }),

    getPendingReviews: builder.query({
      query: ({ token }) => ({
        url: `api/products/reviews/pending-reviews/`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "UserReviews", id: "PENDING" }],
    }),

    // ==================== SALES / ORDERS API ====================

    postSale: builder.mutation({
      query: ({ actualData, token }) => ({
        url: `api/sales/sales/`,
        method: "POST",
        body: actualData,
        headers: createHeaders(token),
      }),
      invalidatesTags: [
        { type: "Orders", id: "LIST" },
        { type: "DashboardStats", id: "LIST" },
        { type: "SalesChart", id: "LIST" },
        { type: "RecentOrders", id: "LIST" },
        { type: "Stocks", id: "LIST" },
        "Cart",
      ],
    }),

    getOrders: builder.query({
      query: ({ token, status, search, rowsperpage, page }) => ({
        url: `api/sales/sales/${
          status && status !== "all" ? `status/${status}/` : ""
        }${buildQueryParams({
          search,
          page_size: rowsperpage,
          page,
        })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: (result: any, _error: any, arg: any) => {
        const statusTag = arg.status || "all";
        if (result?.results) {
          return [
            ...result.results.map((o: any) => ({
              type: "Orders" as const,
              id: o.id,
            })),
            { type: "Orders" as const, id: "LIST" },
            { type: "Orders" as const, id: `STATUS-${statusTag}` },
          ];
        }
        return [
          { type: "Orders" as const, id: "LIST" },
          { type: "Orders" as const, id: `STATUS-${statusTag}` },
        ];
      },
    }),

    getStocks: builder.query({
      query: ({ token, search, page }) => ({
        url: `api/products/stocks/${buildQueryParams({ search, page })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "Stocks", id: "LIST" }],
    }),

    updateSale: builder.mutation({
      query: ({ actualData, token }) => ({
        url: `api/sales/sales/${actualData.id}/`,
        method: "PATCH",
        body: actualData,
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Orders", id: arg.actualData?.id },
        { type: "Orders", id: "LIST" },
        { type: "OrderDetail", id: arg.actualData?.id },
        { type: "DashboardStats", id: "LIST" },
        { type: "RecentOrders", id: "LIST" },
      ],
    }),

    deleteSale: builder.mutation({
      query: ({ id, token }) => ({
        url: `api/sales/sales/${id}/`,
        method: "DELETE",
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Orders", id: arg.id },
        { type: "Orders", id: "LIST" },
        { type: "DashboardStats", id: "LIST" },
        { type: "SalesChart", id: "LIST" },
        { type: "RecentOrders", id: "LIST" },
      ],
    }),

    salesRetrieve: builder.query({
      query: ({ transactionuid, token }) => ({
        url: `api/sales/sales/transaction/${transactionuid}/`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: (_result: any, _error: any, arg: any) => [
        { type: "OrderDetail" as const, id: arg.transactionuid },
      ],
    }),

    // ==================== SHIPPING API ====================

    getshipping: builder.query({
      query: ({ token }) => ({
        url: `api/accounts/shipping/`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: (result: any) =>
        Array.isArray(result)
          ? [
              ...result.map((s: any) => ({
                type: "Shipping" as const,
                id: s.id,
              })),
              { type: "Shipping" as const, id: "LIST" },
            ]
          : [{ type: "Shipping" as const, id: "LIST" }],
    }),

    getdefaultshipping: builder.query({
      query: ({ token }) => ({
        url: `api/accounts/default-address/`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "Shipping", id: "DEFAULT" }],
    }),

    shipping: builder.mutation({
      query: ({ actualData, token }) => ({
        url: `api/accounts/shipping/`,
        method: "POST",
        body: actualData,
        headers: createHeaders(token),
      }),
      invalidatesTags: [
        { type: "Shipping", id: "LIST" },
        { type: "Shipping", id: "DEFAULT" },
      ],
    }),

    updateshipping: builder.mutation({
      query: ({ actualData, token }) => ({
        url: `api/accounts/shipping/${actualData.id}/`,
        method: "PATCH",
        body: actualData,
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Shipping", id: arg.actualData?.id },
        { type: "Shipping", id: "LIST" },
        { type: "Shipping", id: "DEFAULT" },
      ],
    }),

    deleteshipping: builder.mutation({
      query: ({ id, token }) => ({
        url: `api/accounts/shipping/${id}/`,
        method: "DELETE",
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        { type: "Shipping", id: arg.id },
        { type: "Shipping", id: "LIST" },
        { type: "Shipping", id: "DEFAULT" },
      ],
    }),

    // ==================== NEWSLETTER API ====================

    postnewsletter: builder.mutation({
      query: ({ actualData }) => {
        return {
          url: `api/accounts/newsletter/`,
          method: "POST",
          body: actualData,
          headers: createHeaders(),
        };
      },
      invalidatesTags: [{ type: "Newsletter", id: "LIST" }],
    }),

    getnewsletter: builder.query({
      query: ({ token, search, page }) => ({
        url: `api/accounts/newsletter/${buildQueryParams({ search, page })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "Newsletter", id: "LIST" }],
    }),

    // ==================== DASHBOARD API ====================

    getDashboardStats: builder.query({
      query: ({ token, start_date, end_date }) => ({
        url: `api/sales/dashboard/stats/${buildQueryParams({ start_date, end_date })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "DashboardStats", id: "LIST" }],
      keepUnusedDataFor: 2 * 60,
    }),

    getSalesChart: builder.query({
      query: ({ token, start_date, end_date }) => ({
        url: `api/sales/dashboard/sales-chart/${buildQueryParams({ start_date, end_date })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "SalesChart", id: "LIST" }],
      keepUnusedDataFor: 2 * 60,
    }),

    getTopProducts: builder.query({
      query: ({ token, limit }) => ({
        url: `api/sales/dashboard/top-products/${buildQueryParams({ limit })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "TopProducts", id: "LIST" }],
      keepUnusedDataFor: 5 * 60,
    }),

    getRecentOrders: builder.query({
      query: ({ token, limit }) => ({
        url: `api/sales/dashboard/recent-orders/${buildQueryParams({ limit })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "RecentOrders", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getRecentBookings: builder.query({
      query: ({ token, limit }) => ({
        url: `api/sales/dashboard/recent-bookings/${buildQueryParams({ limit })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "RecentBookings", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getVisitorStats: builder.query({
      query: ({ token }) => ({
        url: "api/sales/dashboard/visitors/",
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "VisitorStats", id: "LIST" }],
      keepUnusedDataFor: 3 * 60,
    }),

    getCategoryPerformance: builder.query({
      query: ({ token }) => ({
        url: "api/sales/dashboard/category-performance/",
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: [{ type: "CategoryPerformance", id: "LIST" }],
      keepUnusedDataFor: 5 * 60,
    }),

    // ==================== BOOKING API ====================

    createBooking: builder.mutation({
      query: ({ data, token }: { data: any; token?: string }) => ({
        url: "api/booking/bookings/",
        method: "POST",
        body: data,
        headers: createHeaders(token),
      }),
      invalidatesTags: [
        "Bookings",
        "BookingStats",
        { type: "RecentBookings", id: "LIST" },
      ],
    }),

    getBookings: builder.query({
      query: ({
        token,
        status,
        measurement_type,
        search,
        start_date,
        end_date,
        page,
        rowsperpage,
      }) => ({
        url: `api/booking/bookings/${buildQueryParams({
          status,
          measurement_type,
          search,
          start_date,
          end_date,
          page,
          page_size: rowsperpage,
        })}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: (result: any) => {
        if (Array.isArray(result)) {
          return [
            ...result.map((b: any) => ({
              type: "Bookings" as const,
              id: b.id,
            })),
            { type: "Bookings" as const, id: "LIST" },
          ];
        }
        return [{ type: "Bookings" as const, id: "LIST" }];
      },
    }),

    getBooking: builder.query({
      query: ({ id, token }) => ({
        url: `api/booking/bookings/${id}/`,
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: (_result: any, _error: any, arg: any) => [
        { type: "BookingDetail" as const, id: arg.id },
      ],
    }),

    updateBooking: builder.mutation({
      query: ({ id, data, token }) => ({
        url: `api/booking/bookings/${id}/`,
        method: "PATCH",
        body: data,
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        "Bookings",
        { type: "BookingDetail" as const, id: arg.id },
        "BookingStats",
        { type: "RecentBookings", id: "LIST" },
      ],
    }),

    updateBookingStatus: builder.mutation({
      query: ({ id, status, token }) => ({
        url: `api/booking/bookings/${id}/update_status/`,
        method: "PATCH",
        body: { status },
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        "Bookings",
        { type: "BookingDetail" as const, id: arg.id },
        "BookingStats",
        { type: "RecentBookings", id: "LIST" },
      ],
    }),

    updateMeasurements: builder.mutation({
      query: ({ id, data, token }) => ({
        url: `api/booking/bookings/${id}/update_measurements/`,
        method: "PATCH",
        body: data,
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        "Bookings",
        { type: "BookingDetail" as const, id: arg.id },
        "BookingStats",
      ],
    }),

    deleteBooking: builder.mutation({
      query: ({ id, token }) => ({
        url: `api/booking/bookings/${id}/`,
        method: "DELETE",
        headers: createHeaders(token),
      }),
      invalidatesTags: [
        "Bookings",
        "BookingStats",
        { type: "RecentBookings", id: "LIST" },
      ],
    }),

    updateBill: builder.mutation({
      query: ({ id, data, token }) => ({
        url: `api/booking/bookings/${id}/update_bill/`,
        method: "PATCH",
        body: data,
        headers: createHeaders(token),
      }),
      invalidatesTags: (_result: any, _error: any, arg: any) => [
        "Bookings",
        { type: "BookingDetail" as const, id: arg.id },
      ],
    }),

    sendBillEmail: builder.mutation({
      query: ({ id, token }) => ({
        url: `api/booking/bookings/${id}/send_bill_email/`,
        method: "POST",
        headers: createHeaders(token),
      }),
    }),

    getBookingStats: builder.query({
      query: ({ token }) => ({
        url: "api/booking/bookings/stats/",
        method: "GET",
        headers: createHeaders(token),
      }),
      providesTags: ["BookingStats"],
    }),

    customerLookup: builder.query({
      query: ({ query, token }) => ({
        url: `api/booking/customer-lookup/?q=${query}`,
        method: "GET",
        headers: createHeaders(token),
      }),
      keepUnusedDataFor: 30,
    }),

    generateBillNumber: builder.query({
      query: ({ token }) => ({
        url: "api/booking/generate-bill/",
        method: "GET",
        headers: createHeaders(token),
      }),
    }),
  }),
});

export const {
  // Auth & User
  useUserDeviceMutation,
  useAllUsersQuery,
  useGetLoggedUserQuery,
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useChangeUserPasswordMutation,
  useRefreshTokenMutation,
  useDeleteUserMutation,
  useUpdateUserStateMutation,
  // Products
  useProductsRegistrationMutation,
  useProductsUpdateMutation,
  useProductImageMutation,
  useDeleteproductImageMutation,
  useVariantUpdateMutation,
  useVariantDeleteMutation,
  useProductsViewQuery,
  useProductsByIdsQuery,
  useCheckout_productsQuery,
  useRecommendedProductsViewQuery,
  useTrendingProductsViewQuery,
  useDeleteProductsMutation,
  useNotifyuserMutation,
  useGetnotifyuserQuery,
  useDeleteProductMutation,
  // Cart
  useCartViewQuery,
  useCartPostMutation,
  useCartUpdateMutation,
  useCartDeleteMutation,
  useClearCartMutation,
  // Search
  useSearchPostMutation,
  usePopularKeywordsQuery,
  // Categories
  useCategoryViewQuery,
  useGetCategoryQuery,
  useAddCategoryMutation,
  useUpgradeCategoryMutation,
  useDeleteCategoryMutation,
  // Redeem Codes
  useRedeemCodeViewQuery,
  useVerifyRedeemCodeMutation,
  useAddRedeemCodeMutation,
  useDeleteRedeemCodeMutation,
  useUpdateRedeemCodeMutation,
  // Layout
  useGetlayoutQuery,
  useCreateorUpdatelayoutMutation,
  // Reviews
  usePostReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
  useGetReviewQuery,
  useGetUserReviewQuery,
  useGetPendingReviewsQuery,
  // Sales / Orders
  usePostSaleMutation,
  useGetOrdersQuery,
  useGetStocksQuery,
  useUpdateSaleMutation,
  useDeleteSaleMutation,
  useSalesRetrieveQuery,
  // Shipping
  useGetshippingQuery,
  useGetdefaultshippingQuery,
  useShippingMutation,
  useUpdateshippingMutation,
  useDeleteshippingMutation,
  // Newsletter
  usePostnewsletterMutation,
  useGetnewsletterQuery,
  // Dashboard
  useGetDashboardStatsQuery,
  useGetSalesChartQuery,
  useGetTopProductsQuery,
  useGetRecentOrdersQuery,
  useGetRecentBookingsQuery,
  useGetVisitorStatsQuery,
  useGetCategoryPerformanceQuery,
  // Booking
  useCreateBookingMutation,
  useGetBookingsQuery,
  useGetBookingQuery,
  useUpdateBookingMutation,
  useUpdateBookingStatusMutation,
  useUpdateMeasurementsMutation,
  useDeleteBookingMutation,
  useUpdateBillMutation,
  useSendBillEmailMutation,
  useGetBookingStatsQuery,
  useCustomerLookupQuery,
  useGenerateBillNumberQuery,
} = userAuthapi;
