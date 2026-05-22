"use client";

import React, { useState } from "react";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useGetnewsletterQuery } from "@/lib/store/Service/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail } from "lucide-react";

export default function NewsletterPage() {
    const { accessToken: token } = useAuthUser();
    const [page, setPage] = useState(1);
    // Assuming page search param support as per view_file of api.tsx which showed 'page' arg
    const { data: newsletterData, isLoading } = useGetnewsletterQuery({ token, page });

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Newsletter</h2>
                    <p className="text-muted-foreground">Manage your newsletter subscribers.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <div className="text-2xl font-bold">{newsletterData?.count || 0}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Active subscriptions
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Subscribed Emails</CardTitle>
                    <CardDescription>List of all users subscribed to the newsletter.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Email</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {newsletterData?.results?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">No subscribers yet.</TableCell>
                                    </TableRow>
                                ) : (
                                    newsletterData?.results?.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.id}</TableCell>
                                            <TableCell>{item.email}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
