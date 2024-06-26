import { Injectable, Logger } from '@nestjs/common';
import {
  FilterDto,
  PaginationDto,
  QueryDto,
  SortDto,
} from './dto/connections.dto';
import { CredoService } from 'src/credo/credo.service';

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);
  // Define a constant for the dynamic identifier
  private readonly idField = 'id';

  constructor(private readonly credoService: CredoService) {}

  /**
   * Retrieve all connections with optional filtering, sorting, and pagination.
   * @param query Query parameters for filtering, sorting, and pagination.
   * @returns A promise resolving to the filtered, sorted, and paginated connections.
   */
  async findAll(query: QueryDto): Promise<any> {
    try {
      // Fetch all connections from the credo service
      const connections = await this.credoService.agent.connections.getAll();

      // Apply filtering
      let filteredConnections = this.applyFilter(connections, query?.filter);

      // Apply sorting
      if (query.sort) {
        filteredConnections = this.applySort(filteredConnections, query.sort);
      }

      // Apply cursor pagination
      const paginatedResult = this.cursorPaginate(
        filteredConnections,
        query.pagination,
      );

      return paginatedResult;
    } catch (error) {
      this.logger.error(`Failed to retrieve connections: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply filtering to the connections based on the provided filter DTO.
   * @param connections Array of connections to filter.
   * @param filter Filter DTO with filtering criteria.
   * @returns The filtered array of connections.
   */
  private applyFilter(connections: any[], filter?: FilterDto) {
    if (!filter) return connections;
    return connections.filter((connection) => {
      for (const key in filter) {
        if (key === 'metadata') {
          const { key: metaKey, value: metaValue } = filter.metadata!;
          if (
            !connection.metadata[metaKey] ||
            connection.metadata[metaKey] !== metaValue
          ) {
            return false;
          }
        } else if (connection[key] !== (filter as any)[key]) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Apply sorting to the connections based on the provided sort DTO.
   * @param connections Array of connections to sort.
   * @param sort Sort DTO with sorting criteria.
   * @returns The sorted array of connections.
   */
  private applySort(connections: any[], sort: SortDto) {
    return connections.sort((a, b) => {
      const valueA = a[sort.attribute];
      const valueB = b[sort.attribute];
      if (valueA < valueB) {
        return sort.order === 'asc' ? -1 : 1;
      } else if (valueA > valueB) {
        return sort.order === 'asc' ? 1 : -1;
      } else {
        return 0;
      }
    });
  }

  /**
   * Apply cursor pagination to the filtered connections.
   * @param filteredConnections Array of filtered connections.
   * @param pagination Pagination DTO with pagination criteria.
   * @returns An object containing paginated connections and pagination cursors.
   */
  private cursorPaginate(
    filteredConnections: any[],
    pagination?: PaginationDto,
  ) {
    const { limit, direction, cursor } = pagination || {
      limit: 50,
      cursor: undefined,
    };
    const parsedLimit = parseInt(limit.toString(), 10);
    let startIndex = 0;
    if (cursor) {
      try {
        // const decodedCursor = JSON.parse(
        //   Buffer.from(cursor, 'base64').toString('utf-8'),
        // );
        startIndex = filteredConnections.findIndex(
          (item) => item[this.idField] === cursor,
        );
        if (direction === 'next') {
          startIndex += 1;
        } else if (direction === 'previous') {
          startIndex = Math.max(0, startIndex - parsedLimit);
        }
      } catch (error) {
        throw new Error(`Invalid cursor: ${error.message}`);
      }
    }
    const paginatedConnections = filteredConnections.slice(
      startIndex,
      startIndex + parsedLimit,
    );
    const nextCursor =
      paginatedConnections.length + startIndex !== filteredConnections.length
        ? Buffer.from(
            JSON.stringify({
              [this.idField]:
                paginatedConnections[paginatedConnections.length - 1][
                  this.idField
                ],
            }),
          ).toString('base64')
        : undefined;
    const previousCursor =
      startIndex > 0
        ? Buffer.from(
            JSON.stringify({
              [this.idField]:
                filteredConnections[Math.max(0, startIndex)][this.idField],
            }),
          ).toString('base64')
        : undefined;
    return {
      data: paginatedConnections,
      next: nextCursor,
      previous: previousCursor,
      limit: limit,
    };
  }
}
